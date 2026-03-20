# Steam Bot Account Setup Guide

This guide covers creating a dedicated Steam account for the DotaGenius replay pipeline's Game Coordinator (GC) fallback.

## Why a Dedicated Bot Account?

The replay pipeline needs to query the Dota 2 Game Coordinator to retrieve `replay_salt` values for matches that OpenDota hasn't parsed. This requires an authenticated Steam session. A dedicated bot account keeps the bot's session separate from any personal Steam account.

## Setup Steps

### 1. Create a New Steam Account

1. Go to [store.steampowered.com](https://store.steampowered.com)
2. Click "Install Steam" or navigate to account creation
3. Create a new account with a dedicated email address
4. Choose a username that indicates it's a bot (e.g., `dotagenius-bot`)

### 2. Disable Steam Guard

Steam Guard (two-factor authentication) will block automated logins. Disable it:

1. Log into the Steam client with the new account
2. Go to **Settings** (or **Steam > Settings** on Mac)
3. Navigate to **Account > Manage Steam Guard**
4. Select **Disable Steam Guard** (or equivalent option)
5. Confirm the change via email

**Important:** Without Steam Guard disabled, every login attempt will require a code sent to the account's email, which breaks automated operation.

### 3. No Game Purchase Required

Dota 2 is free-to-play. The bot account does **not** need to:
- Purchase or own any games
- Have Dota 2 installed
- Have a paid Steam account

The `dota2-user` library connects to the GC without the game client.

### 4. Configure Environment Variables

Add the bot credentials to your `.env` file:

```env
STEAM_USERNAME=your-bot-username
STEAM_PASSWORD=your-bot-password
```

Make sure `.env` is in your `.gitignore` (it should be by default).

### 5. Operational Notes

- **Do not log into this account from the regular Steam client while the bot is running.** Steam only allows one active session per account. Logging in elsewhere will disconnect the bot.
- **Rate limit:** The Dota 2 GC allows approximately **100 requests per 24 hours** per account. Exceeding this may result in temporary throttling or soft-bans.
- **Session management:** The bot logs in, makes a single GC request, and logs off. It does not maintain a persistent connection.

## Rate Limiting

| Metric | Limit |
|--------|-------|
| Requests per 24 hours | ~100 |
| Concurrent sessions | 1 |
| Cooldown after limit | Unknown (estimated 1-4 hours) |

The `steam-gc.ts` module tracks request counts and will log a warning when approaching the limit (90+ requests). If the limit is exceeded, the module will throw an error rather than risk a soft-ban.

## Troubleshooting

### "Steam login failed"
- Verify STEAM_USERNAME and STEAM_PASSWORD are correct
- Check that Steam Guard is disabled
- Ensure the account isn't logged in elsewhere

### "GC session timed out"
- Steam servers may be under maintenance (check [steamstat.us](https://steamstat.us))
- The account may be temporarily rate-limited
- Try again after a few minutes

### "Match not found"
- The match ID may be invalid or from a private lobby
- Very old matches may not be available in the GC

## Security Considerations

- Never commit `.env` files containing credentials
- Use a unique password for the bot account (not shared with any personal accounts)
- Consider rotating credentials periodically
- The bot account has no games, items, or wallet balance -- minimal risk if compromised
