#!/bin/bash

echo "🧹 Clearing cards table..."
docker-compose exec -T postgres psql -U postgres -d opentcg -c "TRUNCATE TABLE cards CASCADE;"

echo ""
echo "🚀 Running migration..."
npm run migrate:data

echo ""
echo "✅ Migration complete! Verify in DBeaver with:"
echo "SELECT 'cards' as table, COUNT(*) FROM cards"
echo "UNION ALL SELECT 'tournaments', COUNT(*) FROM tournaments"
echo "UNION ALL SELECT 'matches', COUNT(*) FROM matches"
echo "UNION ALL SELECT 'decks', COUNT(*) FROM decks;"

