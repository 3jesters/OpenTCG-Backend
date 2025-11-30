# Postman Collection Import Guide

This guide explains how to import and use the Postman collection for testing the complete match flow.

## Quick Import

1. **Open Postman**
2. Click **Import** button (top left)
3. Select **File** tab
4. Choose `postman-match-flow-collection.json`
5. Click **Import**

That's it! All requests are now organized by stage in your Postman workspace.

---

## Collection Structure

The collection is organized into **7 folders** (stages):

1. **Stage 1: Match Creation** - Player 1 creates match
2. **Stage 2: Player 2 Joins** - Player 2 joins, deck validation
3. **Stage 3: Match Approval** - Both players approve match
4. **Stage 4: Drawing Initial Cards** - Both players draw 7 cards
5. **Stage 5: Selecting Active Pokemon** - Both players select active Pokemon
6. **Stage 6: Setting Bench Pokemon** - Both players set bench and complete setup
7. **Stage 7: Gameplay (Optional)** - First turn example

---

## Setting Up Variables

The collection uses **environment variables** that you need to configure:

### Default Variables (Pre-configured)

These are already set in the collection:

- `BASE_URL` = `http://localhost:3000`
- `MATCH_ID` = `test-match-curl-flow`
- `TOURNAMENT_ID` = `classic-tournament`
- `PLAYER1_ID` = `test-player-1`
- `PLAYER2_ID` = `test-player-2`
- `FIRE_DECK` = `classic-fire-starter-deck`
- `WATER_DECK` = `classic-water-starter-deck`

### Dynamic Variables (Set During Test)

These need to be set as you progress through the test:

- `PLAYER1_ACTIVE_CARD` - Set after Step 5.4 (get from `playerState.hand[0]`)
- `PLAYER2_ACTIVE_CARD` - Set after Step 5.1 (get from `playerState.hand[0]`)
- `PLAYER1_BENCH_CARD` - Set after Step 6.5 (get from `playerState.hand[1]`)
- `PLAYER2_BENCH_CARD` - Set after Step 6.1 (get from `playerState.hand[1]`)

### How to Set Variables

**Option 1: Collection Variables (Recommended)**

1. Right-click the collection → **Edit**
2. Go to **Variables** tab
3. Update values as needed
4. Click **Save**

**Option 2: Environment Variables**

1. Click **Environments** (left sidebar)
2. Create new environment or use existing
3. Add variables
4. Select environment from dropdown (top right)

**Option 3: Set in Response Scripts (Advanced)**

You can add scripts to automatically extract card IDs from responses. See "Automation" section below.

---

## Running the Tests

### Manual Testing (Step by Step)

1. **Start with Stage 1:**
   - Run "1.1 - Player 1 Creates Match"
   - Check response, verify `state` is `"WAITING_FOR_PLAYERS"`

2. **Continue through each stage:**
   - Follow the order in each folder
   - Check responses match expected values
   - Set dynamic variables when needed

3. **For card IDs:**
   - When you see a "Get First Card" request, run it
   - Copy the `cardId` from `playerState.hand[0]` in the response
   - Update the variable (`PLAYER1_ACTIVE_CARD` or `PLAYER2_ACTIVE_CARD`)
   - Use that variable in the next request

### Example: Setting Active Pokemon

1. Run **"5.1 - Player 2 Gets First Card from Hand"**
2. In the response, find: `playerState.hand[0]`
3. Copy the card ID (e.g., `"pokemon-base-set-v1.0-squirtle--63"`)
4. Update collection variable `PLAYER2_ACTIVE_CARD` with this value
5. Run **"5.2 - Player 2 Sets Active Pokemon"** (it will use the variable)

---

## Automation with Scripts

You can add **Tests** scripts to automatically extract card IDs. Here's an example:

### Auto-Extract Card IDs

Add this to the **Tests** tab of "5.1 - Player 2 Gets First Card from Hand":

```javascript
// Extract first card from hand
const response = pm.response.json();
if (response.playerState && response.playerState.hand && response.playerState.hand.length > 0) {
    const firstCard = response.playerState.hand[0];
    pm.collectionVariables.set("PLAYER2_ACTIVE_CARD", firstCard);
    console.log("Set PLAYER2_ACTIVE_CARD to:", firstCard);
}
```

Add similar scripts to:
- "5.4 - Player 1 Gets First Card from Hand" → Set `PLAYER1_ACTIVE_CARD`
- "6.1 - Player 2 Gets Second Card from Hand" → Set `PLAYER2_BENCH_CARD`
- "6.5 - Player 1 Gets Second Card from Hand" → Set `PLAYER1_BENCH_CARD`

---

## Running Collection in Order

### Using Collection Runner

1. Right-click collection → **Run collection**
2. Select requests to run (or run all)
3. Click **Run**
4. Watch requests execute in order
5. Review results

**Note:** Collection Runner runs requests sequentially, but you may need to:
- Manually set card ID variables between runs
- Add delays for async operations (deck validation)
- Run Player 1 and Player 2 requests separately

### Using Newman (CLI)

Install Newman:
```bash
npm install -g newman
```

Run collection:
```bash
newman run docs/postman-match-flow-collection.json
```

---

## Tips & Best Practices

### 1. Use Two Postman Instances

For true two-player testing:
- Open Postman twice (or use different browsers)
- Import collection in both
- One instance = Player 1, other = Player 2
- Run requests simultaneously

### 2. Save Responses

- Right-click request → **Save Response** → **Save as Example**
- Useful for debugging and reference

### 3. Add Assertions

Add to **Tests** tab to verify responses:

```javascript
pm.test("State is MATCH_APPROVAL", function () {
    const response = pm.response.json();
    pm.expect(response.state).to.eql("MATCH_APPROVAL");
});

pm.test("Opponent deck ID is hidden", function () {
    const response = pm.response.json();
    pm.expect(response.opponentDeckId).to.be.null;
});
```

### 4. Use Pre-request Scripts for Delays

For requests that need delays (like deck validation):

```javascript
// Wait 500ms before request
setTimeout(() => {}, 500);
```

### 5. Organize with Folders

The collection is already organized, but you can:
- Create sub-folders for Player 1 vs Player 2
- Add descriptions to requests
- Tag requests for filtering

---

## Troubleshooting

### Variables Not Working

- Check variable name spelling (case-sensitive)
- Verify variable is set in collection/environment
- Use `{{variable}}` syntax in requests

### Requests Failing

- Verify backend is running on `http://localhost:3000`
- Check `BASE_URL` variable is correct
- Ensure `MATCH_ID` is unique (change if needed)

### Card IDs Not Set

- Manually set variables after getting state
- Or add automation scripts (see above)
- Check response structure matches expected format

### State Not Transitioning

- Add delays between requests (use Pre-request Scripts)
- Check previous request succeeded
- Verify you're using correct `playerId` in queries

---

## Comparison: cURL vs Postman

| Feature | cURL | Postman |
|---------|------|---------|
| **Setup** | Copy-paste commands | Import collection |
| **Variables** | Manual substitution | Built-in variables |
| **Organization** | Sequential in doc | Folders/stages |
| **Response View** | Terminal (needs jq) | Formatted UI |
| **Reusability** | Copy-paste | Click to run |
| **Automation** | Bash scripts | Tests/Pre-request scripts |
| **Two Players** | Two terminals | Two instances |

**Use cURL if:**
- You prefer command line
- You want to script everything
- You're comfortable with terminal

**Use Postman if:**
- You want visual interface
- You want organized requests
- You want to save/compare responses
- You want built-in testing

---

## Next Steps

1. **Import the collection** (see Quick Import above)
2. **Set up variables** (see Setting Up Variables)
3. **Run Stage 1** to test match creation
4. **Continue through stages** sequentially
5. **Add automation** if desired (see Automation section)

---

## File Location

The Postman collection file is located at:
```
docs/postman-match-flow-collection.json
```

You can also find it in the repository root or docs folder.

---

**Related Documentation:**
- [CURL-MATCH-FLOW-TEST.md](./CURL-MATCH-FLOW-TEST.md) - cURL version of the same tests
- [CLIENT-MATCH-LIFECYCLE.md](./CLIENT-MATCH-LIFECYCLE.md) - Complete lifecycle guide
- [MATCH-API.md](./MATCH-API.md) - API reference

