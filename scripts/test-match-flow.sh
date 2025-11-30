#!/bin/bash

# Test Match Flow Script
# Simulates a complete match from creation through card dealing
# Usage: ./test-match-flow.sh [match-id]
#   If match-id is provided, uses existing match, otherwise creates new one

set -e  # Exit on error

BASE_URL="http://localhost:3000/api/v1"
TOURNAMENT_ID="classic-tournament"
PLAYER1_ID="player-1"
PLAYER2_ID="player-2"
PLAYER1_DECK_ID="classic-fire-starter-deck"
PLAYER2_DECK_ID="classic-grass-starter-deck"

# Check if match ID provided as argument
EXISTING_MATCH_ID="$1"

echo "=========================================="
echo "Match Flow Test Script"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to get match state
get_match_state() {
    local match_id=$1
    local match_data=$(curl -s "${BASE_URL}/matches?tournamentId=${TOURNAMENT_ID}" | jq -r ".matches[] | select(.id == \"${match_id}\")")
    if [ -z "$match_data" ] || [ "$match_data" = "null" ] || [ "$match_data" = "" ]; then
        match_data=$(curl -s "${BASE_URL}/matches" | jq -r ".matches[] | select(.id == \"${match_id}\")")
    fi
    echo "$match_data" | jq -r '.state'
}

# Function to wait for state change
wait_for_state() {
    local match_id=$1
    local expected_state=$2
    local max_attempts=10
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        local current_state=$(get_match_state "$match_id")
        if [ "$current_state" = "$expected_state" ]; then
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 0.5
    done
    return 1
}

# Step 1: Create or Use Existing Match
if [ -n "$EXISTING_MATCH_ID" ]; then
    print_step "Step 1: Using existing match: ${EXISTING_MATCH_ID}"
    MATCH_RESPONSE=$(curl -s "${BASE_URL}/matches?tournamentId=${TOURNAMENT_ID}" | jq -r ".matches[] | select(.id == \"${EXISTING_MATCH_ID}\")")
    
    if [ -z "$MATCH_RESPONSE" ] || [ "$MATCH_RESPONSE" = "null" ] || [ "$MATCH_RESPONSE" = "" ]; then
        print_error "Match ${EXISTING_MATCH_ID} not found in tournament ${TOURNAMENT_ID}"
        print_warning "Trying to find match in all matches..."
        MATCH_RESPONSE=$(curl -s "${BASE_URL}/matches" | jq -r ".matches[] | select(.id == \"${EXISTING_MATCH_ID}\")")
        if [ -z "$MATCH_RESPONSE" ] || [ "$MATCH_RESPONSE" = "null" ] || [ "$MATCH_RESPONSE" = "" ]; then
            print_error "Match ${EXISTING_MATCH_ID} not found"
            exit 1
        fi
    fi
    
    MATCH_ID="$EXISTING_MATCH_ID"
    CURRENT_STATE=$(echo "$MATCH_RESPONSE" | jq -r '.state')
    EXISTING_PLAYER1=$(echo "$MATCH_RESPONSE" | jq -r '.player1Id')
    EXISTING_PLAYER2=$(echo "$MATCH_RESPONSE" | jq -r '.player2Id')
    
    print_success "Using existing match: ${MATCH_ID}"
    echo "  State: ${CURRENT_STATE}"
    echo "  Player 1: ${EXISTING_PLAYER1}"
    echo "  Player 2: ${EXISTING_PLAYER2}"
    echo ""
    
    # Check if we need to join players
    NEED_PLAYER1=false
    NEED_PLAYER2=false
    
    if [ "$EXISTING_PLAYER1" = "null" ] || [ -z "$EXISTING_PLAYER1" ]; then
        NEED_PLAYER1=true
    fi
    if [ "$EXISTING_PLAYER2" = "null" ] || [ -z "$EXISTING_PLAYER2" ]; then
        NEED_PLAYER2=true
    fi
else
    print_step "Step 1: Creating new match..."
    MATCH_RESPONSE=$(curl -s -X POST "${BASE_URL}/matches" \
      -H 'Content-Type: application/json' \
      -d "{
        \"tournamentId\": \"${TOURNAMENT_ID}\",
        \"player1Id\": \"${PLAYER1_ID}\",
        \"player1DeckId\": \"${PLAYER1_DECK_ID}\"
      }")

    MATCH_ID=$(echo "$MATCH_RESPONSE" | jq -r '.id')
    CURRENT_STATE=$(echo "$MATCH_RESPONSE" | jq -r '.state')

    if [ "$MATCH_ID" = "null" ] || [ -z "$MATCH_ID" ]; then
        print_error "Failed to create match"
        echo "$MATCH_RESPONSE" | jq '.'
        exit 1
    fi

    print_success "Match created: ${MATCH_ID}"
    echo "  State: ${CURRENT_STATE}"
    echo "  Player 1: ${PLAYER1_ID}"
    echo ""
    NEED_PLAYER1=false
    NEED_PLAYER2=true
fi

# Step 2: Join Players if Needed
if [ "$NEED_PLAYER1" = true ]; then
    print_step "Step 2a: Player 1 joining match..."
    JOIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/matches/${MATCH_ID}/join" \
      -H 'Content-Type: application/json' \
      -d "{
        \"playerId\": \"${PLAYER1_ID}\",
        \"deckId\": \"${PLAYER1_DECK_ID}\"
      }")
    JOIN_STATE=$(echo "$JOIN_RESPONSE" | jq -r '.state')
    print_success "Player 1 joined"
    echo "  State: ${JOIN_STATE}"
    echo ""
fi

if [ "$NEED_PLAYER2" = true ]; then
    print_step "Step 2b: Player 2 joining match..."
    JOIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/matches/${MATCH_ID}/join" \
      -H 'Content-Type: application/json' \
      -d "{
        \"playerId\": \"${PLAYER2_ID}\",
        \"deckId\": \"${PLAYER2_DECK_ID}\"
      }")

    JOIN_STATE=$(echo "$JOIN_RESPONSE" | jq -r '.state')
    print_success "Player 2 joined"
    echo "  State: ${JOIN_STATE}"
    echo "  Player 1: $(echo "$JOIN_RESPONSE" | jq -r '.player1Id')"
    echo "  Player 2: $(echo "$JOIN_RESPONSE" | jq -r '.player2Id')"
    echo ""
fi

# Step 3: Wait for Deck Validation
CURRENT_STATE=$(get_match_state "$MATCH_ID")

if [ "$CURRENT_STATE" = "DECK_VALIDATION" ]; then
    print_step "Step 3: Waiting for deck validation..."
    if wait_for_state "$MATCH_ID" "PRE_GAME_SETUP"; then
        VALIDATION_STATE=$(get_match_state "$MATCH_ID")
        print_success "Decks validated successfully"
        echo "  State: ${VALIDATION_STATE}"
    else
        VALIDATION_STATE=$(get_match_state "$MATCH_ID")
        if [ "$VALIDATION_STATE" = "CANCELLED" ]; then
            print_error "Deck validation failed - match cancelled"
            MATCH_DATA=$(curl -s "${BASE_URL}/matches?tournamentId=${TOURNAMENT_ID}" | jq -r ".matches[] | select(.id == \"${MATCH_ID}\")")
            if [ -z "$MATCH_DATA" ] || [ "$MATCH_DATA" = "null" ]; then
                MATCH_DATA=$(curl -s "${BASE_URL}/matches" | jq -r ".matches[] | select(.id == \"${MATCH_ID}\")")
            fi
            CANCELLATION_REASON=$(echo "$MATCH_DATA" | jq -r '.cancellationReason')
            echo "  Reason: ${CANCELLATION_REASON}"
            exit 1
        else
            print_warning "Still in state: ${VALIDATION_STATE}"
            echo "  Continuing anyway..."
        fi
    fi
    echo ""
elif [ "$CURRENT_STATE" = "PRE_GAME_SETUP" ] || [ "$CURRENT_STATE" = "INITIAL_SETUP" ] || [ "$CURRENT_STATE" = "PLAYER_TURN" ]; then
    print_success "Match already past deck validation (State: ${CURRENT_STATE})"
    echo ""
else
    print_warning "Match in unexpected state: ${CURRENT_STATE}"
    echo ""
fi

# Step 4: Start Match (Coin Flip - Player 1 goes first)
CURRENT_STATE=$(get_match_state "$MATCH_ID")

if [ "$CURRENT_STATE" = "PRE_GAME_SETUP" ]; then
    print_step "Step 4: Starting match (coin flip - Player 1 goes first)..."
    START_RESPONSE=$(curl -s -X POST "${BASE_URL}/matches/${MATCH_ID}/start" \
      -H 'Content-Type: application/json' \
      -d '{
        "firstPlayer": "PLAYER1"
      }')

    START_STATE=$(echo "$START_RESPONSE" | jq -r '.state')
    FIRST_PLAYER=$(echo "$START_RESPONSE" | jq -r '.firstPlayer')

    if [ "$START_STATE" != "INITIAL_SETUP" ]; then
        print_error "Failed to start match. State: ${START_STATE}"
        echo "$START_RESPONSE" | jq '.'
        exit 1
    fi

    print_success "Match started"
    echo "  State: ${START_STATE}"
    echo "  First Player: ${FIRST_PLAYER}"
    echo ""
elif [ "$CURRENT_STATE" = "INITIAL_SETUP" ] || [ "$CURRENT_STATE" = "PLAYER_TURN" ]; then
    print_success "Match already started (State: ${CURRENT_STATE})"
    MATCH_DATA=$(curl -s "${BASE_URL}/matches?tournamentId=${TOURNAMENT_ID}" | jq -r ".matches[] | select(.id == \"${MATCH_ID}\")")
    if [ -z "$MATCH_DATA" ] || [ "$MATCH_DATA" = "null" ]; then
        MATCH_DATA=$(curl -s "${BASE_URL}/matches" | jq -r ".matches[] | select(.id == \"${MATCH_ID}\")")
    fi
    FIRST_PLAYER=$(echo "$MATCH_DATA" | jq -r '.firstPlayer')
    echo "  First Player: ${FIRST_PLAYER}"
    echo ""
else
    print_warning "Cannot start match from state: ${CURRENT_STATE}"
    echo ""
fi

# Step 5: Check Game State - Cards Should Be Dealt
print_step "Step 5: Checking game state - cards should be dealt..."
GAME_STATE_RESPONSE=$(curl -s "${BASE_URL}/matches/${MATCH_ID}/state?playerId=${PLAYER1_ID}")

PLAYER1_HAND_COUNT=$(echo "$GAME_STATE_RESPONSE" | jq -r '.playerState.handCount')
PLAYER1_DECK_COUNT=$(echo "$GAME_STATE_RESPONSE" | jq -r '.playerState.deckCount')
PLAYER1_PRIZE_COUNT=$(echo "$GAME_STATE_RESPONSE" | jq -r '.playerState.prizeCardsRemaining')

PLAYER2_HAND_COUNT=$(echo "$GAME_STATE_RESPONSE" | jq -r '.opponentState.handCount')
PLAYER2_DECK_COUNT=$(echo "$GAME_STATE_RESPONSE" | jq -r '.opponentState.deckCount')
PLAYER2_PRIZE_COUNT=$(echo "$GAME_STATE_RESPONSE" | jq -r '.opponentState.prizeCardsRemaining')

CURRENT_STATE=$(echo "$GAME_STATE_RESPONSE" | jq -r '.state')
TURN_NUMBER=$(echo "$GAME_STATE_RESPONSE" | jq -r '.turnNumber')
PHASE=$(echo "$GAME_STATE_RESPONSE" | jq -r '.phase')

echo ""
echo "=========================================="
echo "Game State Summary"
echo "=========================================="
echo "Match State: ${CURRENT_STATE}"
echo "Turn Number: ${TURN_NUMBER}"
echo "Phase: ${PHASE}"
echo ""
echo "Player 1 (${PLAYER1_ID}):"
echo "  Hand: ${PLAYER1_HAND_COUNT} cards"
echo "  Deck: ${PLAYER1_DECK_COUNT} cards remaining"
echo "  Prize Cards: ${PLAYER1_PRIZE_COUNT} remaining"
echo ""
echo "Player 2 (${PLAYER2_ID}):"
echo "  Hand: ${PLAYER2_HAND_COUNT} cards"
echo "  Deck: ${PLAYER2_DECK_COUNT} cards remaining"
echo "  Prize Cards: ${PLAYER2_PRIZE_COUNT} remaining"
echo ""

# Validate expected values
if [ "$PLAYER1_HAND_COUNT" -eq 7 ] && [ "$PLAYER2_HAND_COUNT" -eq 7 ]; then
    print_success "✓ Both players have 7 cards in hand"
else
    print_error "✗ Expected 7 cards each, got Player1: ${PLAYER1_HAND_COUNT}, Player2: ${PLAYER2_HAND_COUNT}"
fi

if [ "$PLAYER1_PRIZE_COUNT" -eq 6 ] && [ "$PLAYER2_PRIZE_COUNT" -eq 6 ]; then
    print_success "✓ Both players have 6 prize cards"
else
    print_error "✗ Expected 6 prize cards each, got Player1: ${PLAYER1_PRIZE_COUNT}, Player2: ${PLAYER2_PRIZE_COUNT}"
fi

# Step 6: Show Player 1's Hand
print_step "Step 6: Player 1's hand details..."
PLAYER1_HAND=$(echo "$GAME_STATE_RESPONSE" | jq -r '.playerState.hand[]')
echo "Player 1 Hand Cards:"
if [ -n "$PLAYER1_HAND" ]; then
    echo "$PLAYER1_HAND" | while read -r card; do
        echo "  - $card"
    done
else
    echo "  (No cards in hand)"
fi
echo ""

# Step 7: Show Full Match Details
print_step "Step 7: Full match details..."
FULL_MATCH=$(curl -s "${BASE_URL}/matches?tournamentId=${TOURNAMENT_ID}" | jq -r ".matches[] | select(.id == \"${MATCH_ID}\")")
if [ -z "$FULL_MATCH" ] || [ "$FULL_MATCH" = "null" ]; then
    FULL_MATCH=$(curl -s "${BASE_URL}/matches" | jq -r ".matches[] | select(.id == \"${MATCH_ID}\")")
fi
echo "$FULL_MATCH" | jq '{
    id,
    tournamentId,
    player1Id,
    player2Id,
    state,
    firstPlayer,
    currentPlayer,
    startedAt
}'
echo ""

# Step 8: Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
print_success "Match Flow Test Completed!"
echo ""
echo "Match ID: ${MATCH_ID}"
echo "Final State: ${CURRENT_STATE}"
echo ""
echo "Cards Dealt:"
echo "  Player 1: ${PLAYER1_HAND_COUNT} cards in hand, ${PLAYER1_DECK_COUNT} in deck, ${PLAYER1_PRIZE_COUNT} prize cards"
echo "  Player 2: ${PLAYER2_HAND_COUNT} cards in hand, ${PLAYER2_DECK_COUNT} in deck, ${PLAYER2_PRIZE_COUNT} prize cards"
echo ""
echo "Next Steps:"
echo "  - Players can now set their active Pokemon"
echo "  - Match will transition to PLAYER_TURN after initial setup"
echo ""

