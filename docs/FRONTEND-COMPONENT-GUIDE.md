# OpenTCG Frontend - Component Guide

Visual and structural guide for building frontend components.

---

## Table of Contents

- [CardItem Component](#carditem-component)
- [CardDetail Component](#carddetail-component)
- [SearchBar Component](#searchbar-component)
- [FilterSidebar Component](#filtersidebar-component)
- [SetCard Component](#setcard-component)
- [Type Icons](#type-icons)
- [Energy Icons](#energy-icons)
- [Rarity Badges](#rarity-badges)
- [Layout Examples](#layout-examples)

---

## CardItem Component

**Purpose:** Display a card in a grid or list view (compact form)

### Structure

```
┌─────────────────────┐
│                     │
│    [Card Image]     │
│                     │
├─────────────────────┤
│ ⚡ Pikachu      HP 60│
├─────────────────────┤
│ Base Set      25/102│
│ ★★★ Rare Holo      │
└─────────────────────┘
```

### Component Code

```tsx
interface CardItemProps {
  card: CardSummary;
  onClick?: (cardId: string) => void;
}

const CardItem: React.FC<CardItemProps> = ({ card, onClick }) => {
  const typeColor = getTypeColor(card.pokemonType);
  
  return (
    <div 
      className="card-item"
      onClick={() => onClick?.(card.cardId)}
      style={{ '--type-color': typeColor } as React.CSSProperties}
    >
      {/* Card Image */}
      <div className="card-image-container">
        <img 
          src={card.imageUrl || '/placeholder-card.png'} 
          alt={card.name}
          loading="lazy"
        />
        <RarityBadge rarity={card.rarity} />
      </div>
      
      {/* Card Header */}
      <div className="card-header">
        {card.pokemonType && (
          <TypeIcon type={card.pokemonType} size="sm" />
        )}
        <span className="card-name">{card.name}</span>
        {card.hp && (
          <span className="card-hp">HP {card.hp}</span>
        )}
      </div>
      
      {/* Card Footer */}
      <div className="card-footer">
        <span className="card-set">{card.setName}</span>
        <span className="card-number">{card.cardNumber}</span>
      </div>
    </div>
  );
};
```

### Styling (Tailwind)

```tsx
<div className="
  bg-white rounded-lg shadow-md overflow-hidden 
  hover:shadow-xl hover:-translate-y-1 
  transition-all duration-200 cursor-pointer
  border-2 border-gray-200
">
  {/* Image */}
  <div className="relative aspect-[3/4] bg-gray-100">
    <img 
      className="w-full h-full object-cover" 
      src={card.imageUrl} 
      alt={card.name}
    />
    <div className="absolute top-2 right-2">
      <RarityBadge rarity={card.rarity} />
    </div>
  </div>
  
  {/* Header */}
  <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200">
    {card.pokemonType && <TypeIcon type={card.pokemonType} />}
    <span className="font-semibold text-gray-900 flex-1 truncate">
      {card.name}
    </span>
    {card.hp && (
      <span className="text-sm font-bold text-red-600">
        HP {card.hp}
      </span>
    )}
  </div>
  
  {/* Footer */}
  <div className="flex justify-between px-3 py-2 text-xs text-gray-600">
    <span>{card.setName}</span>
    <span className="font-mono">{card.cardNumber}</span>
  </div>
</div>
```

### States

**Hover:**
- Lift card slightly (`transform: translateY(-4px)`)
- Increase shadow
- Optional glow effect based on rarity

**Loading (Skeleton):**
```tsx
<div className="card-item-skeleton animate-pulse">
  <div className="w-full aspect-[3/4] bg-gray-300 rounded" />
  <div className="h-4 bg-gray-300 rounded mt-2" />
  <div className="h-3 bg-gray-300 rounded mt-1 w-2/3" />
</div>
```

---

## CardDetail Component

**Purpose:** Display full card information

### Structure

```
┌──────────────────────────────────────────┐
│  ← Back to Results                        │
├──────────────────────────────────────────┤
│                                           │
│   ┌───────────────┐    ALAKAZAM          │
│   │               │    HP 80      ⚡      │
│   │  Card Image   │    Stage 2 Pokemon   │
│   │   (Large)     │    Evolves from Kadabra│
│   │               │                       │
│   └───────────────┘    ╔════════════════╗│
│                        ║ Ability         ║│
│   [Download] [Share]   ║ Damage Swap    ║│
│                        ║ As often as... ║│
│                        ╚════════════════╝│
│                                           │
│   ╔══════════════════════════════════════╗│
│   ║ Attacks                              ║│
│   ║ ⚡⚡⚡ Confuse Ray           30     ║│
│   ║ Flip a coin. If heads...             ║│
│   ╚══════════════════════════════════════╝│
│                                           │
│   Weakness: ⚡ ×2    Resistance: -       │
│   Retreat Cost: ●●●                       │
│                                           │
│   "Its brain can outperform..."          │
│   Artist: Ken Sugimori                    │
│   Base Set • 1/102 • ★★★ Rare Holo       │
└──────────────────────────────────────────┘
```

### Component Code

```tsx
interface CardDetailProps {
  card: CardDetail;
  onClose?: () => void;
}

const CardDetail: React.FC<CardDetailProps> = ({ card, onClose }) => {
  return (
    <div className="card-detail">
      {/* Header */}
      <div className="card-detail-header">
        <button onClick={onClose}>← Back</button>
        <h1>{card.name}</h1>
      </div>
      
      {/* Content Grid */}
      <div className="card-detail-grid">
        {/* Left: Image */}
        <div className="card-detail-image">
          <img src={card.imageUrl} alt={card.name} />
          <div className="card-actions">
            <button>Download</button>
            <button>Share</button>
          </div>
        </div>
        
        {/* Right: Info */}
        <div className="card-detail-info">
          {/* Stats */}
          <div className="card-stats">
            <div className="stat">
              <span className="label">HP</span>
              <span className="value">{card.hp}</span>
            </div>
            {card.pokemonType && (
              <div className="stat">
                <span className="label">Type</span>
                <TypeIcon type={card.pokemonType} />
              </div>
            )}
            {card.stage && (
              <div className="stat">
                <span className="label">Stage</span>
                <span className="value">{card.stage.replace('_', ' ')}</span>
              </div>
            )}
          </div>
          
          {/* Evolution */}
          {card.evolvesFrom && (
            <div className="evolution-info">
              <span>Evolves from </span>
              <a href={`/cards?query=${card.evolvesFrom}`}>
                {card.evolvesFrom}
              </a>
            </div>
          )}
          
          {/* Ability */}
          {card.ability && (
            <AbilitySection ability={card.ability} />
          )}
          
          {/* Attacks */}
          {card.attacks && card.attacks.length > 0 && (
            <AttacksSection attacks={card.attacks} />
          )}
          
          {/* Weakness/Resistance */}
          <div className="card-modifiers">
            {card.weakness && (
              <div className="modifier">
                <span className="label">Weakness:</span>
                <TypeIcon type={card.weakness.type} />
                <span>{card.weakness.modifier}</span>
              </div>
            )}
            {card.resistance && (
              <div className="modifier">
                <span className="label">Resistance:</span>
                <TypeIcon type={card.resistance.type} />
                <span>{card.resistance.modifier}</span>
              </div>
            )}
            {card.retreatCost !== undefined && (
              <div className="modifier">
                <span className="label">Retreat Cost:</span>
                <EnergyIcons count={card.retreatCost} type="COLORLESS" />
              </div>
            )}
          </div>
          
          {/* Description */}
          {card.description && (
            <p className="card-description">"{card.description}"</p>
          )}
          
          {/* Metadata */}
          <div className="card-metadata">
            <p>Artist: {card.artist}</p>
            <p>
              {card.setName} • {card.cardNumber} • 
              <RarityBadge rarity={card.rarity} />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Ability Section

```tsx
interface AbilitySectionProps {
  ability: Ability;
}

const AbilitySection: React.FC<AbilitySectionProps> = ({ ability }) => {
  return (
    <div className="ability-section">
      <div className="section-header">
        <span className="section-title">Ability</span>
        <span className="ability-type">{ability.activationType}</span>
      </div>
      <div className="ability-content">
        <h4 className="ability-name">{ability.name}</h4>
        <p className="ability-text">{ability.text}</p>
        {ability.usageLimit !== 'UNLIMITED' && (
          <span className="ability-limit">
            {ability.usageLimit.replace('_', ' ')}
          </span>
        )}
      </div>
    </div>
  );
};
```

### Attacks Section

```tsx
interface AttacksSectionProps {
  attacks: Attack[];
}

const AttacksSection: React.FC<AttacksSectionProps> = ({ attacks }) => {
  return (
    <div className="attacks-section">
      <div className="section-header">
        <span className="section-title">Attacks</span>
      </div>
      <div className="attacks-list">
        {attacks.map((attack, index) => (
          <div key={index} className="attack-item">
            <div className="attack-header">
              <div className="attack-cost">
                {attack.energyCost.map((type, i) => (
                  <EnergyIcon key={i} type={type} size="sm" />
                ))}
              </div>
              <span className="attack-name">{attack.name}</span>
              <span className="attack-damage">{attack.damage}</span>
            </div>
            {attack.text && (
              <p className="attack-text">{attack.text}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## SearchBar Component

**Purpose:** Search input with icon and clear button

### Structure

```
┌────────────────────────────────────┐
│ 🔍  Search cards...            [×] │
└────────────────────────────────────┘
```

### Component Code

```tsx
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  value, 
  onChange, 
  onSearch,
  placeholder = 'Search cards...'
}) => {
  const debouncedSearch = useDebouncedCallback(
    (searchValue: string) => {
      onSearch?.(searchValue);
    },
    300
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    debouncedSearch(newValue);
  };

  const handleClear = () => {
    onChange('');
    onSearch?.('');
  };

  return (
    <div className="relative">
      {/* Search Icon */}
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-5 w-5 text-gray-400" />
      </div>
      
      {/* Input */}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="
          block w-full pl-10 pr-10 py-2
          border border-gray-300 rounded-lg
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          placeholder-gray-400
        "
      />
      
      {/* Clear Button */}
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <XIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
        </button>
      )}
    </div>
  );
};
```

---

## FilterSidebar Component

**Purpose:** Display filter options for search

### Structure

```
┌─────────────────────┐
│ Filters      [Clear]│
├─────────────────────┤
│ Card Type           │
│ ☐ Pokemon           │
│ ☐ Trainer           │
│ ☐ Energy            │
│                     │
│ Pokemon Type        │
│ ☐ 🔥 Fire          │
│ ☐ 💧 Water         │
│ ☐ ⚡ Lightning     │
│ ...                 │
│                     │
│ Rarity              │
│ ☐ Common            │
│ ☐ Rare              │
│ ☐ ★ Holo           │
│                     │
│ Author              │
│ ☐ pokemon           │
│ ☐ custom            │
│                     │
│ [Apply Filters]     │
└─────────────────────┘
```

### Component Code

```tsx
interface FilterSidebarProps {
  filters: SearchFilters;
  onChange: (filters: Partial<SearchFilters>) => void;
  onApply?: () => void;
  onClear?: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({ 
  filters, 
  onChange, 
  onApply,
  onClear 
}) => {
  return (
    <div className="filter-sidebar">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Filters</h3>
        <button 
          onClick={onClear}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Clear All
        </button>
      </div>
      
      {/* Card Type Filter */}
      <FilterSection title="Card Type">
        {Object.values(CardType).map(type => (
          <CheckboxItem
            key={type}
            label={type}
            checked={filters.cardType === type}
            onChange={(checked) => 
              onChange({ cardType: checked ? type : undefined })
            }
          />
        ))}
      </FilterSection>
      
      {/* Pokemon Type Filter */}
      <FilterSection title="Pokemon Type">
        {Object.values(PokemonType).map(type => (
          <CheckboxItem
            key={type}
            label={
              <span className="flex items-center gap-2">
                <TypeIcon type={type} size="xs" />
                {type}
              </span>
            }
            checked={filters.pokemonType === type}
            onChange={(checked) => 
              onChange({ pokemonType: checked ? type : undefined })
            }
          />
        ))}
      </FilterSection>
      
      {/* Rarity Filter */}
      <FilterSection title="Rarity">
        {Object.values(Rarity).map(rarity => (
          <CheckboxItem
            key={rarity}
            label={rarity.replace('_', ' ')}
            checked={filters.rarity === rarity}
            onChange={(checked) => 
              onChange({ rarity: checked ? rarity : undefined })
            }
          />
        ))}
      </FilterSection>
      
      {/* Apply Button (mobile) */}
      <button 
        onClick={onApply}
        className="w-full mt-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 md:hidden"
      >
        Apply Filters
      </button>
    </div>
  );
};

const FilterSection: React.FC<{ title: string; children: React.ReactNode }> = ({ 
  title, 
  children 
}) => (
  <div className="mb-6">
    <h4 className="font-semibold text-sm text-gray-700 mb-2">{title}</h4>
    <div className="space-y-2">
      {children}
    </div>
  </div>
);

const CheckboxItem: React.FC<{
  label: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center space-x-2 cursor-pointer">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
    />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);
```

---

## SetCard Component

**Purpose:** Display a card set in a list or grid

### Structure

```
┌─────────────────────────────────┐
│ [Set Icon/Image]                │
│                                 │
│ Pokemon Base Set                │
│ 102 Cards • Released 1999       │
│ ✓ Official Set                  │
│                                 │
│ "The original Pokémon TCG..."   │
│                                 │
│         [View Set →]            │
└─────────────────────────────────┘
```

### Component Code

```tsx
interface SetCardProps {
  set: CardSet;
  onClick?: () => void;
}

const SetCard: React.FC<SetCardProps> = ({ set, onClick }) => {
  return (
    <div 
      className="
        bg-white rounded-lg shadow-md p-6
        hover:shadow-xl transition-shadow cursor-pointer
        border border-gray-200
      "
      onClick={onClick}
    >
      {/* Set Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {set.setName}
          </h3>
          <p className="text-sm text-gray-600">
            {set.totalCards} Cards • Released {new Date(set.dateReleased).getFullYear()}
          </p>
        </div>
        {set.official && (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
            Official
          </span>
        )}
      </div>
      
      {/* Description */}
      <p className="text-sm text-gray-700 mb-4 line-clamp-2">
        {set.description}
      </p>
      
      {/* Author */}
      <p className="text-xs text-gray-500 mb-3">
        By {set.author}
      </p>
      
      {/* Action */}
      <button className="
        w-full py-2 px-4 
        bg-blue-600 text-white 
        rounded-lg hover:bg-blue-700
        transition-colors
      ">
        View Set →
      </button>
    </div>
  );
};
```

---

## Type Icons

**Purpose:** Display Pokemon/Energy type icons

### Icon Mapping

```tsx
const typeIcons = {
  GRASS: '🌿',
  FIRE: '🔥',
  WATER: '💧',
  LIGHTNING: '⚡',
  PSYCHIC: '🔮',
  FIGHTING: '👊',
  DARKNESS: '🌙',
  METAL: '⚙️',
  FAIRY: '✨',
  DRAGON: '🐉',
  COLORLESS: '⭐'
};
```

### Component

```tsx
interface TypeIconProps {
  type: PokemonType;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const TypeIcon: React.FC<TypeIconProps> = ({ type, size = 'md' }) => {
  const sizeClasses = {
    xs: 'w-4 h-4 text-xs',
    sm: 'w-5 h-5 text-sm',
    md: 'w-6 h-6 text-base',
    lg: 'w-8 h-8 text-lg'
  };
  
  const color = getTypeColor(type);
  
  return (
    <div 
      className={`
        ${sizeClasses[size]}
        rounded-full flex items-center justify-center
        font-bold text-white shadow-sm
      `}
      style={{ backgroundColor: color }}
      title={type}
    >
      {typeIcons[type]}
    </div>
  );
};

const getTypeColor = (type: PokemonType): string => {
  const colors = {
    GRASS: '#78C850',
    FIRE: '#F08030',
    WATER: '#6890F0',
    LIGHTNING: '#F8D030',
    PSYCHIC: '#F85888',
    FIGHTING: '#C03028',
    DARKNESS: '#705848',
    METAL: '#B8B8D0',
    FAIRY: '#EE99AC',
    DRAGON: '#7038F8',
    COLORLESS: '#A8A878'
  };
  return colors[type] || '#A8A878';
};
```

---

## Energy Icons

**Purpose:** Display energy cost (multiple icons)

```tsx
interface EnergyIconsProps {
  types: EnergyType[];  // or for retreat cost
  count?: number;       // for colorless/retreat
  type?: EnergyType;
}

const EnergyIcons: React.FC<EnergyIconsProps> = ({ types, count, type }) => {
  // If count is provided, show that many icons of the same type
  if (count !== undefined && type) {
    return (
      <div className="flex gap-0.5">
        {Array.from({ length: count }).map((_, i) => (
          <EnergyIcon key={i} type={type} size="sm" />
        ))}
      </div>
    );
  }
  
  // Otherwise show the provided types
  return (
    <div className="flex gap-0.5">
      {types.map((energyType, i) => (
        <EnergyIcon key={i} type={energyType} size="sm" />
      ))}
    </div>
  );
};

const EnergyIcon: React.FC<{ type: EnergyType; size?: string }> = ({ 
  type, 
  size = 'sm' 
}) => {
  const sizeClass = size === 'xs' ? 'w-4 h-4' : 'w-5 h-5';
  
  return (
    <div 
      className={`${sizeClass} rounded-full`}
      style={{ backgroundColor: getTypeColor(type) }}
    >
      {/* Or use actual energy icon images */}
      <span className="text-xs">{typeIcons[type]}</span>
    </div>
  );
};
```

---

## Rarity Badges

**Purpose:** Display rarity indicator

```tsx
interface RarityBadgeProps {
  rarity: Rarity;
  size?: 'sm' | 'md';
}

const RarityBadge: React.FC<RarityBadgeProps> = ({ rarity, size = 'sm' }) => {
  const colors = {
    COMMON: 'bg-gray-500',
    UNCOMMON: 'bg-green-500',
    RARE: 'bg-blue-500',
    RARE_HOLO: 'bg-purple-500',
    RARE_ULTRA: 'bg-pink-500',
    RARE_SECRET: 'bg-amber-500',
    PROMO: 'bg-red-500'
  };
  
  const stars = {
    COMMON: '',
    UNCOMMON: '★',
    RARE: '★★',
    RARE_HOLO: '★★★',
    RARE_ULTRA: '★★★★',
    RARE_SECRET: '★★★★★',
    PROMO: '🎁'
  };
  
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  
  return (
    <span 
      className={`
        ${colors[rarity]} ${sizeClass}
        text-white font-semibold rounded-full
        inline-flex items-center gap-1
      `}
    >
      {stars[rarity]}
      <span>{rarity.replace('_', ' ')}</span>
    </span>
  );
};
```

---

## Layout Examples

### 1. Home Page Layout

```
┌────────────────────────────────────────────┐
│  [Logo]  OpenTCG    [Search]    [Nav]      │
├────────────────────────────────────────────┤
│                                            │
│        Welcome to OpenTCG                  │
│        Browse thousands of TCG cards       │
│                                            │
│        [Browse Sets]  [Search Cards]       │
│                                            │
├────────────────────────────────────────────┤
│  Featured Sets                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐     │
│  │Base Set │ │ Jungle  │ │ Fossil  │     │
│  └─────────┘ └─────────┘ └─────────┘     │
└────────────────────────────────────────────┘
```

### 2. Set Browser Page

```
┌────────────────────────────────────────────┐
│  [Header with Nav]                         │
├────────────────────────────────────────────┤
│  Browse Card Sets                          │
│  [Filter: All Authors ▼] [Official Only ☑]│
├────────────────────────────────────────────┤
│  ┌──────────────────┐ ┌──────────────────┐│
│  │ Pokemon Base Set │ │ Pokemon Jungle   ││
│  │ 102 Cards • 1999 │ │ 64 Cards • 1999  ││
│  │ [View Set]       │ │ [View Set]       ││
│  └──────────────────┘ └──────────────────┘│
│  ┌──────────────────┐ ┌──────────────────┐│
│  │ Pokemon Fossil   │ │ Custom Set       ││
│  │ 62 Cards • 1999  │ │ 50 Cards • 2024  ││
│  │ [View Set]       │ │ [View Set]       ││
│  └──────────────────┘ └──────────────────┘│
└────────────────────────────────────────────┘
```

### 3. Card Grid Page (Set Detail)

```
┌────────────────────────────────────────────┐
│  [Header]                                  │
├────────────────────────────────────────────┤
│  ← Back to Sets                            │
│  Pokemon Base Set (102 cards)              │
│  Released: January 9, 1999                 │
├────────────────────────────────────────────┤
│  [Sort: Card Number ▼]                     │
├────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │
│  │Card1│ │Card2│ │Card3│ │Card4│ │Card5│ │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ │
│  │Card6│ │Card7│ │Card8│ │Card9│ │Card │ │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ │
│  [Load More] or [1 2 3 ... 10]             │
└────────────────────────────────────────────┘
```

### 4. Search Page with Filters

```
┌────────────────────────────────────────────┐
│  [Header]                                  │
├────────────────────────────────────────────┤
│  [🔍 Search cards...]                      │
├──────────────┬─────────────────────────────┤
│  Filters     │  Results (45)               │
│              │  [Sort: Name ▼]             │
│  Card Type   │                             │
│  ☑ Pokemon   │  ┌─────┐ ┌─────┐ ┌─────┐  │
│  ☐ Trainer   │  │Card1│ │Card2│ │Card3│  │
│  ☐ Energy    │  └─────┘ └─────┘ └─────┘  │
│              │  ┌─────┐ ┌─────┐ ┌─────┐  │
│  Type        │  │Card4│ │Card5│ │Card6│  │
│  ☑ Fire      │  └─────┘ └─────┘ └─────┘  │
│  ☐ Water     │                             │
│  ☐ Grass     │  [1] 2 3 4 5 Next          │
│              │                             │
│  Rarity      │                             │
│  ☑ Holo      │                             │
│              │                             │
│  [Clear All] │                             │
└──────────────┴─────────────────────────────┘
```

### 5. Mobile Layout (Responsive)

```
┌──────────────────┐
│ ☰  [Search]  [•] │  ← Hamburger menu
├──────────────────┤
│                  │
│  [Card 1]        │  ← Single column
│  [Card 2]        │
│  [Card 3]        │
│                  │
│  [Filters Button]│  ← Bottom sheet
│  [Load More]     │
│                  │
├──────────────────┤
│ [Home][Browse][•]│  ← Bottom nav
└──────────────────┘
```

---

## Responsive Breakpoints

```css
/* Mobile First */
.card-grid {
  grid-template-columns: 1fr;        /* Mobile: 1 column */
}

@media (min-width: 640px) {
  .card-grid {
    grid-template-columns: repeat(2, 1fr);  /* Tablet: 2 columns */
  }
}

@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: repeat(3, 1fr);  /* Desktop: 3 columns */
  }
}

@media (min-width: 1024px) {
  .card-grid {
    grid-template-columns: repeat(4, 1fr);  /* Large: 4 columns */
  }
}

@media (min-width: 1280px) {
  .card-grid {
    grid-template-columns: repeat(5, 1fr);  /* XL: 5 columns */
  }
}
```

---

## Animation Examples

### Card Hover
```css
.card-item {
  transition: transform 0.2s, box-shadow 0.2s;
}

.card-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}
```

### Holo Effect (Rare Cards)
```css
@keyframes holo-shine {
  0% { background-position: -100% -100%; }
  100% { background-position: 200% 200%; }
}

.card-holo {
  background: linear-gradient(
    45deg,
    transparent 30%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 70%
  );
  background-size: 200% 200%;
  animation: holo-shine 3s ease-in-out infinite;
}
```

### Modal/Detail Fade In
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.card-detail-modal {
  animation: fadeIn 0.2s ease-in;
}
```

---

## Accessibility Checklist

- [ ] All images have `alt` text
- [ ] Interactive elements are keyboard accessible
- [ ] Focus visible on all focusable elements
- [ ] ARIA labels for icon buttons
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Screen reader announcements for dynamic content
- [ ] Skip navigation link
- [ ] Form labels properly associated

---

**For API details:** See [API.md](./API.md)

**For full architecture:** See [FRONTEND-APP.md](./FRONTEND-APP.md)

