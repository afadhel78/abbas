import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';

const filename = process.argv[2];
if (!filename || !(process.env.NEON_URL || process.env.DATABASE_URL)) throw new Error('Usage: NEON_URL=... node scripts/import-sites-data.mjs <export.json>');
const { applications, members } = JSON.parse(await readFile(filename, 'utf8'));
if (!Array.isArray(applications) || !Array.isArray(members)) throw new Error('Invalid export file');
const sql = neon(process.env.NEON_URL || process.env.DATABASE_URL);
const existing = await sql`SELECT COUNT(*)::int AS count FROM applications`;
if (existing[0].count !== 0) throw new Error('Destination is not empty; import stopped to avoid duplicate or overwritten applications');
for (const a of applications) {
  await sql`INSERT INTO applications (id,game_name,discord_id,age,hours,experience,previous_gang_name,reason,roleplay,created_at,status,rejection_reason,reviewed_at)
    VALUES (${a.id},${a.game_name},${a.discord_id},${a.age},${a.hours},${a.experience},${a.previous_gang_name},${a.reason},${a.roleplay},${a.created_at},${a.status},${a.rejection_reason},${a.reviewed_at})`;
}
for (const m of members) {
  await sql`INSERT INTO members (id,application_id,game_name,discord_id,joined_at)
    VALUES (${m.id},${m.application_id},${m.game_name},${m.discord_id},${m.joined_at})`;
}
await sql`SELECT setval(pg_get_serial_sequence('applications','id'), GREATEST((SELECT COALESCE(MAX(id),0) FROM applications),1), true)`;
await sql`SELECT setval(pg_get_serial_sequence('members','id'), GREATEST((SELECT COALESCE(MAX(id),0) FROM members),1), true)`;
const [aCount, mCount] = await Promise.all([sql`SELECT COUNT(*)::int AS count FROM applications`,sql`SELECT COUNT(*)::int AS count FROM members`]);
if (aCount[0].count !== applications.length || mCount[0].count !== members.length) throw new Error('Import count mismatch');
console.log(`Imported ${aCount[0].count} applications and ${mCount[0].count} members`);
