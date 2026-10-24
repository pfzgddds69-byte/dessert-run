// Cloudflare Pages Function: bind a D1 database named DB in Pages settings.
const schema = "CREATE TABLE IF NOT EXISTS leaderboard (player_id TEXT PRIMARY KEY, nickname TEXT NOT NULL, meters INTEGER NOT NULL DEFAULT 0, score INTEGER NOT NULL DEFAULT 0, stage TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)";
const headers = {"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*"};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
async function database(env){if(!env.DB)return null;await env.DB.prepare(schema).run();return env.DB}
export async function onRequestGet({env}){
 try{const db=await database(env);if(!db)return reply({error:"온라인 랭킹 데이터베이스 연결이 필요해요."},503);
 const {results}=await db.prepare("SELECT nickname AS name, meters, score, stage FROM leaderboard WHERE meters > 0 ORDER BY meters DESC, score DESC LIMIT 10").all();
 return reply({ranking:results||[]})}catch(e){return reply({error:"랭킹을 불러올 수 없어요."},503)}
}
export async function onRequestPost({request,env}){
 try{const db=await database(env);if(!db)return reply({error:"온라인 랭킹 데이터베이스 연결이 필요해요."},503);
 const body=await request.json();const id=String(body.playerId||"").trim(),name=String(body.name||"").trim(),meters=Number(body.meters),score=Number(body.score);
 if(!/^[a-zA-Z0-9_.-]{8,128}$/.test(id)||!name||name.length>12||!Number.isSafeInteger(meters)||meters<0||meters>10000000||!Number.isSafeInteger(score)||score<0||score>1000000000)return reply({error:"잘못된 기록이에요."},400);
 const stage=String(body.stage||"").slice(0,30);
 await db.prepare("INSERT INTO leaderboard (player_id,nickname,meters,score,stage) VALUES (?,?,?,?,?) ON CONFLICT(player_id) DO UPDATE SET nickname=excluded.nickname,meters=excluded.meters,score=excluded.score,stage=excluded.stage,updated_at=CURRENT_TIMESTAMP WHERE excluded.meters>leaderboard.meters OR (excluded.meters=leaderboard.meters AND excluded.score>leaderboard.score)").bind(id,name,meters,score,stage).run();
 return reply({ok:true})}catch(e){return reply({error:"기록을 저장할 수 없어요."},503)}
}
