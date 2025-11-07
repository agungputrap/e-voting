const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const now = new Date();
const hoursFromNow = (hours) => new Date(now.getTime() + hours * 60 * 60 * 1000);

function formatDuration(targetDate, referenceDate = now) {
  const diffMs = targetDate.getTime() - referenceDate.getTime();
  if (diffMs <= 0) {
    return "0m";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes && parts.length < 2) parts.push(`${minutes}m`);

  return parts.length > 0 ? parts.join(" ") : "0m";
}

async function main() {
  await prisma.vote.deleteMany();
  await prisma.tokenBlacklist.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.event.deleteMany();
  await prisma.voter.deleteMany();

  const voterSeeds = [
    {
      name: "Noor Aziz",
      walletId: "0xvalidator1",
      nonce: "nonce-aziz",
      lastLogin: hoursFromNow(-4),
    },
    {
      name: "Mateo Rivera",
      walletId: "0xvalidator2",
      nonce: "nonce-rivera",
      lastLogin: hoursFromNow(-30),
    },
    {
      name: "Sasha Kim",
      walletId: "0xvalidator3",
      nonce: null,
      lastLogin: hoursFromNow(-12),
    },
    {
      name: "Ivy Chen",
      walletId: "0xvalidator4",
      nonce: "nonce-ivy",
      lastLogin: hoursFromNow(-8),
    },
    {
      name: "Liam O'Connor",
      walletId: "0xvalidator5",
      nonce: null,
      lastLogin: hoursFromNow(-55),
    },
    {
      name: "Priyanka Bose",
      walletId: "0xvalidator6",
      nonce: "nonce-bose",
      lastLogin: hoursFromNow(-3),
    },
    {
      name: "Gabriel Laurent",
      walletId: "0xvalidator7",
      nonce: "nonce-laurent",
      lastLogin: hoursFromNow(-18),
    },
    {
      name: "Amelia Rossi",
      walletId: "0xvalidator8",
      nonce: null,
      lastLogin: hoursFromNow(-6),
    },
  ];

  const voters = await Promise.all(
    voterSeeds.map((voter) =>
      prisma.voter.create({
        data: {
          ...voter,
          walletId: voter.walletId.toLowerCase(),
        },
      })
    )
  );

  const voterByWallet = new Map(
    voters.map((voter) => [voter.walletId.toLowerCase(), voter])
  );

  const eventSeeds = [
    {
      name: "DAO Governance Upgrade",
      description: "Vote on the next modular upgrade for the governance protocol.",
      startTime: hoursFromNow(-36),
      endTime: hoursFromNow(36),
      createdBy: "0xorganizerdao",
      blockAddress: "0xDaoGov2025",
      imgUrl:
        "https://images.unsplash.com/photo-1580894897200-5a269ba9d9d0?w=640&auto=format&fit=crop",
      isOwner: true,
      isActive: true,
      candidates: [
        { name: "Proposal Alpha" },
        { name: "Proposal Beta" },
        { name: "Proposal Gamma" },
      ],
      votes: [
        {
          voterWallet: "0xvalidator1",
          candidateName: "Proposal Alpha",
          blockAddress: "0xVoteDao1",
        },
        {
          voterWallet: "0xvalidator2",
          candidateName: "Proposal Beta",
          blockAddress: "0xVoteDao2",
        },
        {
          voterWallet: "0xvalidator3",
          candidateName: "Proposal Alpha",
          blockAddress: "0xVoteDao3",
        },
        {
          voterWallet: "0xvalidator4",
          candidateName: "Proposal Gamma",
          blockAddress: "0xVoteDao4",
        },
      ],
    },
    {
      name: "Sustainability Hackathon Voting",
      description: "Choose the winning prototype from the global green tech hackathon.",
      startTime: hoursFromNow(-18),
      endTime: hoursFromNow(78),
      createdBy: "0xearthnode",
      blockAddress: "0xHackathonGreen",
      imgUrl:
        "https://images.unsplash.com/photo-1470246973918-29a93221c455?w=640&auto=format&fit=crop",
      isOwner: false,
      isActive: true,
      candidates: [
        { name: "Carbon Capture Drone" },
        { name: "Ocean Cleanup Swarm" },
        { name: "Solar Fabric Grid" },
        { name: "Waste-to-Energy IoT" },
      ],
      votes: [
        {
          voterWallet: "0xvalidator5",
          candidateName: "Solar Fabric Grid",
          blockAddress: "0xVoteHack1",
        },
        {
          voterWallet: "0xvalidator6",
          candidateName: "Ocean Cleanup Swarm",
          blockAddress: "0xVoteHack2",
        },
        {
          voterWallet: "0xvalidator7",
          candidateName: "Solar Fabric Grid",
          blockAddress: "0xVoteHack3",
        },
      ],
    },
    {
      name: "NFT Art Showcase People's Choice",
      description: "Collectors decide which digital artist receives the residency grant.",
      startTime: hoursFromNow(-6),
      endTime: hoursFromNow(30),
      createdBy: "0xgallerydao",
      blockAddress: "0xNFTShowcase",
      imgUrl:
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=640&auto=format&fit=crop",
      isOwner: false,
      isActive: true,
      candidates: [
        { name: "Aurora Spirits" },
        { name: "Voxel Dreamscape" },
        { name: "Chromatic Bloom" },
        { name: "Glitch Sonata" },
      ],
      votes: [
        {
          voterWallet: "0xvalidator1",
          candidateName: "Aurora Spirits",
          blockAddress: "0xVoteArt1",
        },
        {
          voterWallet: "0xvalidator6",
          candidateName: "Chromatic Bloom",
          blockAddress: "0xVoteArt2",
        },
        {
          voterWallet: "0xvalidator8",
          candidateName: "Aurora Spirits",
          blockAddress: "0xVoteArt3",
        },
        {
          voterWallet: "0xvalidator3",
          candidateName: "Voxel Dreamscape",
          blockAddress: "0xVoteArt4",
        },
      ],
    },
    {
      name: "AI Ethics Council Appointment",
      description: "Elect members to oversee deployment of responsible AI tooling.",
      startTime: hoursFromNow(-48),
      endTime: hoursFromNow(12),
      createdBy: "0xethicslab",
      blockAddress: "0xAICouncilVote",
      imgUrl:
        "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=640&auto=format&fit=crop",
      isOwner: true,
      isActive: true,
      candidates: [
        { name: "Dr. Lina Hart" },
        { name: "Prof. Omar Singh" },
        { name: "Dr. Mei Kobayashi" },
      ],
      votes: [
        {
          voterWallet: "0xvalidator2",
          candidateName: "Prof. Omar Singh",
          blockAddress: "0xVoteAI1",
        },
        {
          voterWallet: "0xvalidator5",
          candidateName: "Dr. Lina Hart",
          blockAddress: "0xVoteAI2",
        },
        {
          voterWallet: "0xvalidator7",
          candidateName: "Dr. Mei Kobayashi",
          blockAddress: "0xVoteAI3",
        },
      ],
    },
    {
      name: "City Smart Grid Expansion",
      description: "Citizens prioritize which districts receive smart grid upgrades first.",
      startTime: hoursFromNow(-24),
      endTime: hoursFromNow(60),
      createdBy: "0xcityops",
      blockAddress: "0xSmartGrid2025",
      imgUrl:
        "https://images.unsplash.com/photo-1505731132164-cca90383e1af?w=640&auto=format&fit=crop",
      isOwner: false,
      isActive: true,
      candidates: [
        { name: "Innovation District" },
        { name: "Harbor Front" },
        { name: "University Quarter" },
      ],
      votes: [
        {
          voterWallet: "0xvalidator4",
          candidateName: "Innovation District",
          blockAddress: "0xVoteGrid1",
        },
        {
          voterWallet: "0xvalidator8",
          candidateName: "Harbor Front",
          blockAddress: "0xVoteGrid2",
        },
        {
          voterWallet: "0xvalidator3",
          candidateName: "Innovation District",
          blockAddress: "0xVoteGrid3",
        },
      ],
    },
    {
      name: "Quantum Research Grant Allocation",
      description: "Choose which lab will receive the next round of quantum funding.",
      startTime: hoursFromNow(24),
      endTime: hoursFromNow(120),
      createdBy: "0xresearchdao",
      blockAddress: "0xQuantumGrant",
      imgUrl:
        "https://images.unsplash.com/photo-1526378722445-4b04bd2c6c16?w=640&auto=format&fit=crop",
      isOwner: false,
      isActive: false,
      candidates: [
        { name: "Nova Qubit Lab" },
        { name: "Entangle Research Hub" },
        { name: "Photon Initiative" },
      ],
      votes: [],
    },
    {
      name: "Global E-Voting Summit Agenda",
      description: "Delegates decide the keynote topics for the international summit.",
      startTime: hoursFromNow(72),
      endTime: hoursFromNow(168),
      createdBy: "0xsummitcore",
      blockAddress: "0xSummitAgenda",
      imgUrl:
        "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=640&auto=format&fit=crop",
      isOwner: true,
      isActive: false,
      candidates: [
        { name: "Zero-Knowledge Governance" },
        { name: "Cross-Chain Identity" },
        { name: "Regenerative Voting Systems" },
        { name: "AI-assisted Auditing" },
      ],
      votes: [],
    },
  ];

  const eventRecords = [];

  for (const seed of eventSeeds) {
    const { candidates, votes, ...eventData } = seed;

    const event = await prisma.event.create({
      data: {
        ...eventData,
        isCompleted: false,
        winner: null,
        timeLeft: null,
        totalVotes: 0,
        candidatesCount: candidates.length,
        candidates: {
          create: candidates,
        },
      },
      include: {
        candidates: true,
      },
    });

    eventRecords.push({ event, plannedVotes: votes });
  }

  const eventVoteStats = new Map();

  for (const { event, plannedVotes } of eventRecords) {
    for (const vote of plannedVotes) {
      const voter = voterByWallet.get(vote.voterWallet.toLowerCase());
      if (!voter) {
        throw new Error(`Voter ${vote.voterWallet} not found while seeding votes`);
      }

      const candidate = event.candidates.find(
        (candidate) => candidate.name === vote.candidateName
      );

      if (!candidate) {
        throw new Error(
          `Candidate ${vote.candidateName} not found for event ${event.name}`
        );
      }

      await prisma.vote.create({
        data: {
          voterId: voter.id,
          eventId: event.id,
          candidateId: candidate.id,
          blockAddress: vote.blockAddress,
        },
      });

      if (!eventVoteStats.has(event.id)) {
        eventVoteStats.set(event.id, {
          totalVotes: 0,
          candidateCounts: new Map(),
        });
      }

      const stats = eventVoteStats.get(event.id);
      stats.totalVotes += 1;
      stats.candidateCounts.set(
        candidate.id,
        (stats.candidateCounts.get(candidate.id) || 0) + 1
      );
    }
  }

  for (const { event } of eventRecords) {
    const stats = eventVoteStats.get(event.id) || {
      totalVotes: 0,
      candidateCounts: new Map(),
    };

    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);
    const hasStarted = startTime <= now;
    const hasEnded = endTime <= now;

    let winner = null;
    if (hasEnded && stats.totalVotes > 0) {
      const counts = [...stats.candidateCounts.entries()].sort((a, b) => b[1] - a[1]);
      const [topCandidateId, topCount] = counts[0];
      const hasTie = counts.some(
        ([, count], index) => index > 0 && count === topCount
      );
      if (!hasTie) {
        const winnerCandidate = event.candidates.find(
          (candidate) => candidate.id === topCandidateId
        );
        winner = winnerCandidate ? winnerCandidate.name : null;
      } else {
        winner = "Tie";
      }
    }

    let timeLeft = "Finished";
    if (!hasEnded) {
      timeLeft = hasStarted
        ? `Ends in ${formatDuration(endTime)}`
        : `Starts in ${formatDuration(startTime)}`;
    }

    await prisma.event.update({
      where: { id: event.id },
      data: {
        totalVotes: stats.totalVotes,
        candidatesCount: event.candidates.length,
        winner,
        isCompleted: hasEnded,
        isActive: hasStarted && !hasEnded,
        timeLeft,
      },
    });
  }

  await prisma.tokenBlacklist.createMany({
    data: [
      {
        token: "expired-token-1",
        jti: "jti-l1",
        userId: voters[0].id,
        expiresAt: hoursFromNow(-1),
      },
      {
        token: "revoked-token-2",
        jti: "jti-l2",
        userId: voters[1].id,
        expiresAt: hoursFromNow(48),
      },
      {
        token: "revoked-token-3",
        jti: "jti-l3",
        userId: voters[3].id,
        expiresAt: hoursFromNow(12),
      },
    ],
  });

  console.log(
    "Database seeded: 5 live events, 2 upcoming events, with candidates, voters, and votes."
  );
}

main()
  .catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
