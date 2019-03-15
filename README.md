# Discord XP Bot

Configuration:
 - `$REDIS_URL` Redis host:port (optional)
 - `$REDIS_PREFIX` Redis ZSET key prefix (one key per group)
 - `$DISCORD_TOKEN` Discord Bot Token
 - `$BOT_CHANNEL` Channel where commands work
 - `$IGNORED_CHANNELS` Comma-separated list of channels where no XP can be earned
 - `$GROUP_ID` Redis group ID
 - `$RATE_LIMIT` User cooldown after earning XP (seconds)
 
Commands:
 - `/xp` Get current XP
 - `/ranks` Get top XP users

Redis keys:
 - `${REDIS_PREFIX}_${GROUP_ID}` Leaderboard
