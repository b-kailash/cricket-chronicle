import { PrismaClient, BattingStyle, BowlingStyle, PlayerRole, MatchFormat } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin123!', 12);
  try {
    const adminUser = await prisma.user.create({
      data: {
        email: 'admin@cricket.com',
        passwordHash: adminPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: 'PROVINCIAL_ADMIN',
      },
    });
    console.log(`Created admin user: ${adminUser.email}`);
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('Admin user already exists');
    } else {
      throw error;
    }
  }

  // Create Province
  const province = await prisma.province.create({
    data: {
      name: 'Western Province',
      regionCode: 'WP',
      country: 'South Africa',
      contactName: 'John Smith',
      contactEmail: 'wp@cricket.co.za',
      contactPhone: '+27 21 123 4567',
    },
  });
  console.log(`Created province: ${province.name}`);

  // Create Clubs
  const club1 = await prisma.club.create({
    data: {
      name: 'Cape Town Cricket Club',
      provinceId: province.id,
      homeGround: 'Newlands Cricket Ground',
      gpsLat: -33.9767,
      gpsLong: 18.4712,
      groundCapacity: 25000,
      facilities: 'Pavilion, Nets, Gym',
      pocName: 'Mike Johnson',
      pocEmail: 'ctcc@cricket.co.za',
      pocPhone: '+27 21 234 5678',
    },
  });
  console.log(`Created club: ${club1.name}`);

  const club2 = await prisma.club.create({
    data: {
      name: 'Stellenbosch Cricket Club',
      provinceId: province.id,
      homeGround: 'Stellenbosch University Ground',
      gpsLat: -33.9320,
      gpsLong: 18.8602,
      groundCapacity: 5000,
      facilities: 'Pavilion, Nets',
      pocName: 'Peter Williams',
      pocEmail: 'scc@cricket.co.za',
      pocPhone: '+27 21 345 6789',
    },
  });
  console.log(`Created club: ${club2.name}`);

  // Create Division
  const division = await prisma.division.create({
    data: {
      name: 'Premier League',
      provinceId: province.id,
      rankLevel: 1,
      ageGroup: 'SENIOR',
      gender: 'MEN',
    },
  });
  console.log(`Created division: ${division.name}`);

  // Create Teams
  const team1 = await prisma.team.create({
    data: {
      label: '1st XI',
      clubId: club1.id,
      divisionId: division.id,
      pocName: 'David Brown',
      pocEmail: 'team1@ctcc.co.za',
      maxSquadSize: 22,
    },
  });
  console.log(`Created team: ${club1.name} ${team1.label}`);

  const team2 = await prisma.team.create({
    data: {
      label: '1st XI',
      clubId: club2.id,
      divisionId: division.id,
      pocName: 'Chris Martin',
      pocEmail: 'team1@scc.co.za',
      maxSquadSize: 22,
    },
  });
  console.log(`Created team: ${club2.name} ${team2.label}`);

  // Player names for realistic data
  const playerNames = [
    // Team 1 players
    { firstName: 'James', lastName: 'Anderson', role: PlayerRole.BOWLER, bowlingStyle: BowlingStyle.RIGHT_ARM_FAST },
    { firstName: 'Ben', lastName: 'Stokes', role: PlayerRole.ALL_ROUNDER, bowlingStyle: BowlingStyle.RIGHT_ARM_MEDIUM },
    { firstName: 'Joe', lastName: 'Root', role: PlayerRole.BATTER, bowlingStyle: BowlingStyle.RIGHT_ARM_OFF_SPIN },
    { firstName: 'Stuart', lastName: 'Broad', role: PlayerRole.BOWLER, bowlingStyle: BowlingStyle.RIGHT_ARM_FAST },
    { firstName: 'Jonny', lastName: 'Bairstow', role: PlayerRole.WICKET_KEEPER, bowlingStyle: null },
    { firstName: 'Chris', lastName: 'Woakes', role: PlayerRole.ALL_ROUNDER, bowlingStyle: BowlingStyle.RIGHT_ARM_MEDIUM },
    { firstName: 'Mark', lastName: 'Wood', role: PlayerRole.BOWLER, bowlingStyle: BowlingStyle.RIGHT_ARM_FAST },
    { firstName: 'Harry', lastName: 'Brook', role: PlayerRole.BATTER, bowlingStyle: null },
    { firstName: 'Zak', lastName: 'Crawley', role: PlayerRole.BATTER, bowlingStyle: null },
    { firstName: 'Ollie', lastName: 'Pope', role: PlayerRole.BATTER, bowlingStyle: null },
    { firstName: 'Jack', lastName: 'Leach', role: PlayerRole.BOWLER, bowlingStyle: BowlingStyle.LEFT_ARM_ORTHODOX },
    // Team 2 players
    { firstName: 'Virat', lastName: 'Kohli', role: PlayerRole.BATTER, bowlingStyle: BowlingStyle.RIGHT_ARM_MEDIUM },
    { firstName: 'Rohit', lastName: 'Sharma', role: PlayerRole.BATTER, bowlingStyle: BowlingStyle.RIGHT_ARM_OFF_SPIN },
    { firstName: 'Jasprit', lastName: 'Bumrah', role: PlayerRole.BOWLER, bowlingStyle: BowlingStyle.RIGHT_ARM_FAST },
    { firstName: 'Ravindra', lastName: 'Jadeja', role: PlayerRole.ALL_ROUNDER, bowlingStyle: BowlingStyle.LEFT_ARM_ORTHODOX },
    { firstName: 'Rishabh', lastName: 'Pant', role: PlayerRole.WICKET_KEEPER, bowlingStyle: null },
    { firstName: 'Mohammed', lastName: 'Shami', role: PlayerRole.BOWLER, bowlingStyle: BowlingStyle.RIGHT_ARM_FAST },
    { firstName: 'KL', lastName: 'Rahul', role: PlayerRole.BATTER, bowlingStyle: null },
    { firstName: 'Shubman', lastName: 'Gill', role: PlayerRole.BATTER, bowlingStyle: null },
    { firstName: 'Ravichandran', lastName: 'Ashwin', role: PlayerRole.ALL_ROUNDER, bowlingStyle: BowlingStyle.RIGHT_ARM_OFF_SPIN },
    { firstName: 'Mohammed', lastName: 'Siraj', role: PlayerRole.BOWLER, bowlingStyle: BowlingStyle.RIGHT_ARM_FAST },
    { firstName: 'Shreyas', lastName: 'Iyer', role: PlayerRole.BATTER, bowlingStyle: null },
  ];

  // Create Team 1 players
  const team1Players = [];
  for (let i = 0; i < 11; i++) {
    const playerData = playerNames[i];
    const registrationId = `CTCC-${2026}-${String(i + 1).padStart(3, '0')}`;

    const player = await prisma.player.upsert({
      where: { registrationId },
      update: {},
      create: {
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        dateOfBirth: new Date(1990 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        email: `${playerData.firstName.toLowerCase()}.${playerData.lastName.toLowerCase()}@ctcc.co.za`,
        jerseyNumber: i + 1,
        battingStyle: Math.random() > 0.2 ? BattingStyle.RIGHT_HAND : BattingStyle.LEFT_HAND,
        bowlingStyle: playerData.bowlingStyle,
        primaryRole: playerData.role,
        teamId: team1.id,
        registrationId,
      },
    });
    team1Players.push(player);
  }
  console.log(`Created 11 players for ${club1.name}`);

  // Create Team 2 players
  const team2Players = [];
  for (let i = 0; i < 11; i++) {
    const playerData = playerNames[i + 11];
    const registrationId = `SCC-${2026}-${String(i + 1).padStart(3, '0')}`;

    const player = await prisma.player.upsert({
      where: { registrationId },
      update: {},
      create: {
        firstName: playerData.firstName,
        lastName: playerData.lastName,
        dateOfBirth: new Date(1990 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        email: `${playerData.firstName.toLowerCase()}.${playerData.lastName.toLowerCase()}@scc.co.za`,
        jerseyNumber: i + 1,
        battingStyle: Math.random() > 0.2 ? BattingStyle.RIGHT_HAND : BattingStyle.LEFT_HAND,
        bowlingStyle: playerData.bowlingStyle,
        primaryRole: playerData.role,
        teamId: team2.id,
        registrationId,
      },
    });
    team2Players.push(player);
  }
  console.log(`Created 11 players for ${club2.name}`);

  // Create Competition
  const competition = await prisma.competition.create({
    data: {
      name: 'WP Premier League 2025-2026',
      season: '2025-2026',
      format: MatchFormat.T20,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-03-31'),
      provinceId: province.id,
      divisionId: division.id,
      oversPerInnings: 20,
      status: 'IN_PROGRESS',
    },
  });
  console.log(`Created competition: ${competition.name}`);

  console.log('\n--- Seed Data Summary ---');
  console.log(`Province: ${province.name} (ID: ${province.id})`);
  console.log(`Clubs: ${club1.name} (ID: ${club1.id}), ${club2.name} (ID: ${club2.id})`);
  console.log(`Division: ${division.name} (ID: ${division.id})`);
  console.log(`Teams: ${team1.label} (ID: ${team1.id}), ${team2.label} (ID: ${team2.id})`);
  console.log(`Players: 22 total (11 per team)`);
  console.log(`Competition: ${competition.name} (ID: ${competition.id})`);
  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
