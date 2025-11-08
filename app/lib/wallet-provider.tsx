"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useActiveAccount, type Account } from "@panna/sdk";

// Define the shape of our wallet context
interface WalletContextType {
  // The Panna SDK account object (needed for on-chain transactions)
  account: Account | null;
  // The current auth token (JWT)
  authToken: string | null;
  // The connected wallet address
  walletAddress: string | null;
  // Whether the user is authenticated (has both wallet and token)
  isAuthenticated: boolean;
  // Whether we're currently logging in/registering
  isLoading: boolean;
  // Login function that creates JWT token from wallet (auto-registers if needed)
  login: () => Promise<void>;
  // Register function that creates a new user account
  register: (name: string) => Promise<void>;
  // Logout function that clears the token
  logout: () => Promise<void>;
}

// Create the context with undefined as default
// This forces consumers to use the hook which checks for provider
const WalletContext = createContext<WalletContextType | undefined>(undefined);

/**
 * WalletProvider manages wallet authentication state and JWT tokens
 * 
 * This provider wraps the Panna SDK functionality and provides:
 * - Automatic wallet detection
 * - JWT token generation and storage
 * - Authentication state management
 * 
 * Usage:
 * ```tsx
 * <WalletProvider>
 *   <App />
 * </WalletProvider>
 * ```
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  // Get the active account from Panna SDK
  const account = useActiveAccount();
  
  // State for managing auth token and loading status
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Extract wallet address from the account
  const walletAddress = account?.address || null;

  // User is authenticated if they have both wallet and token
  const isAuthenticated = !!(walletAddress && authToken);

  /**
   * Register function that:
   * 1. Takes the connected wallet address
   * 2. Calls the backend /api/auth/register endpoint
   * 3. Stores the returned JWT token
   */
  const register = useCallback(async (name: string) => {
    if (!walletAddress) {
      throw new Error("No wallet connected");
    }

    setIsLoading(true);
    try {
      // Call the backend register endpoint with wallet ID and name
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletId: walletAddress.toLowerCase(),
          name: name || "Anonymous User",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Store the JWT token in state
      if (data.success && data.token) {
        setAuthToken(data.token);
      } else {
        throw new Error("No token received from server");
      }
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress]);

  /**
   * Login function that:
   * 1. Takes the connected wallet address
   * 2. Calls the backend /api/auth/login endpoint
   * 3. Stores the returned JWT token
   * 4. If login fails with "not found", automatically tries to register
   */
  const login = useCallback(async () => {
    if (!walletAddress) {
      throw new Error("No wallet connected");
    }

    setIsLoading(true);
    try {
      // Try to login first
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletId: walletAddress.toLowerCase(),
        }),
      });

      const data = await response.json();

      // If wallet not found, automatically register
      if (response.status === 404) {
        // Auto-register with a default name
        await register(`User ${walletAddress.slice(0, 6)}`);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store the JWT token in state
      if (data.success && data.token) {
        setAuthToken(data.token);
      } else {
        throw new Error("No token received from server");
      }
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, register]);

  /**
   * Logout function that:
   * 1. Calls the backend /api/auth/logout endpoint to blacklist the token
   * 2. Clears the local auth token
   */
  const logout = useCallback(async () => {
    if (!authToken) {
      return;
    }

    setIsLoading(true);
    try {
      // Call the backend logout endpoint to blacklist the token
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Clear the token from state regardless of backend response
      setAuthToken(null);
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear the token even if backend call fails
      setAuthToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  /**
   * Auto-login when wallet is connected
   * This attempts to get a JWT token whenever a wallet connects
   */
  useEffect(() => {
    // Only auto-login if we have a wallet but no token
    if (walletAddress && !authToken && !isLoading) {
      // Try to login automatically
      login().catch((error) => {
        console.error("Auto-login failed:", error);
        // If auto-login fails, the user may need to register first
      });
    }
  }, [walletAddress, authToken, isLoading, login]);

  /**
   * Clear auth token when wallet disconnects
   */
  useEffect(() => {
    if (!walletAddress && authToken) {
      setAuthToken(null);
    }
  }, [walletAddress, authToken]);

  // Provide the context value to children (memoized to avoid re-renders)
  // @ts-expect-error - TypeScript cache issue with Account vs Wallet type
  const value: WalletContextType = useMemo(
    () => ({
      account: account ?? null,
      authToken,
      walletAddress,
      isAuthenticated,
      isLoading,
      login,
      register,
      logout,
    }),
    [account, authToken, walletAddress, isAuthenticated, isLoading, login, register, logout]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

/**
 * Hook to access wallet authentication context
 * 
 * Must be used within a WalletProvider
 * 
 * @throws {Error} When used outside of WalletProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { authToken, isAuthenticated, login, register, logout } = useWallet();
 *   
 *   if (!isAuthenticated) {
 *     return (
 *       <>
 *         <button onClick={login}>Login (auto-registers if needed)</button>
 *         <button onClick={() => register("My Name")}>Register with custom name</button>
 *       </>
 *     );
 *   }
 *   
 *   return <button onClick={logout}>Logout</button>;
 * }
 * ```
 */
export function useWallet(): WalletContextType {
  const context = useContext(WalletContext);
  
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  
  return context;
}
