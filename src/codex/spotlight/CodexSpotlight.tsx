import { Image } from '@mantine/core';
import {
  IconBackspace,
  IconBox,
  IconBuildingFactory2,
  IconChevronRight,
  IconCornerDownLeft,
  IconHomeCog,
  IconStairsUp,
  IconToolsKitchen2,
} from '@tabler/icons-react';
import { Command } from 'cmdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Factory } from '@/factories/Factory';
import { useGameFactories } from '@/games/store/gameFactoriesSelectors';
import {
  AllFactoryBuildings,
  type FactoryBuilding,
} from '@/recipes/FactoryBuilding';
import {
  AllFactoryItems,
  AllFactoryItemsMap,
  type FactoryItem,
  FactoryItemForm,
} from '@/recipes/FactoryItem';
import { AllFactoryRecipes, type FactoryRecipe } from '@/recipes/FactoryRecipe';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import { type TierGroup, TierGroups } from '../tiers/tierUnlocks';
import './cmdk.css';

type Page = 'items' | 'buildings' | 'recipes' | 'factories' | 'tiers';

const validItems = AllFactoryItems.filter(
  item => item.form !== FactoryItemForm.Invalid,
);

let openSpotlightFn: (() => void) | null = null;

export function openSpotlight() {
  openSpotlightFn?.();
}

export function CodexSpotlight() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pages, setPages] = useState<Page[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const factories = useGameFactories();

  const page = pages[pages.length - 1];

  useEffect(() => {
    openSpotlightFn = () => setOpen(true);
    return () => {
      openSpotlightFn = null;
    };
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll side effect
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [search]);

  const pushPage = useCallback((p: Page) => {
    setPages(prev => [...prev, p]);
    setSearch('');
  }, []);

  const popPage = useCallback(() => {
    setPages(prev => prev.slice(0, -1));
    setSearch('');
  }, []);

  const select = useCallback(
    (path: string) => {
      setOpen(false);
      setPages([]);
      setSearch('');
      navigate(path);
    },
    [navigate],
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={o => {
        setOpen(o);
        if (!o) {
          setPages([]);
          setSearch('');
        }
      }}
      label="Codex Search"
      loop
    >
      {pages.length > 0 && (
        <div className="cmdk-header">
          {pages.map(p => (
            <span key={p} className="cmdk-badge">
              {p === 'factories'
                ? 'Factories'
                : p === 'items'
                  ? 'Items'
                  : p === 'buildings'
                    ? 'Buildings'
                    : p === 'tiers'
                      ? 'Tiers'
                      : 'Recipes'}
            </span>
          ))}
        </div>
      )}

      <Command.Input
        ref={inputRef}
        value={search}
        onValueChange={setSearch}
        placeholder={
          !page
            ? 'Search...'
            : page === 'factories'
              ? 'Search factories...'
              : page === 'items'
                ? 'Search items...'
                : page === 'buildings'
                  ? 'Search buildings...'
                  : page === 'tiers'
                    ? 'Search tiers...'
                    : 'Search recipes...'
        }
        onKeyDown={(e: React.KeyboardEvent) => {
          if (
            pages.length > 0 &&
            (e.key === 'Escape' || (e.key === 'Backspace' && !search))
          ) {
            e.preventDefault();
            popPage();
          }
        }}
      />

      <Command.List ref={listRef}>
        <Command.Empty>No results found.</Command.Empty>

        {!page && !search && (
          <RootPage pushPage={pushPage} factoryCount={factories.length} />
        )}
        {!page && search && (
          <UnifiedResultsPage factories={factories} select={select} />
        )}
        {page === 'factories' && (
          <FactoriesPage factories={factories} select={select} />
        )}
        {page === 'items' && <ItemsPage select={select} />}
        {page === 'buildings' && <BuildingsPage select={select} />}
        {page === 'recipes' && <RecipesPage select={select} />}
        {page === 'tiers' && <TiersPage select={select} />}
      </Command.List>

      <div className="cmdk-footer">
        <span>{page === 'factories' ? 'Factories' : 'Codex'}</span>
        <span>
          {pages.length > 0 ? (
            <>
              <kbd>
                <IconCornerDownLeft size={12} />
              </kbd>{' '}
              select &nbsp;{' '}
              <kbd>
                <IconBackspace size={12} />
              </kbd>{' '}
              back &nbsp; <kbd>esc</kbd> close
            </>
          ) : (
            <>
              <kbd>
                <IconCornerDownLeft size={12} />
              </kbd>{' '}
              select &nbsp; <kbd>esc</kbd> close
            </>
          )}
        </span>
      </div>
    </Command.Dialog>
  );
}

function RootPage({
  pushPage,
  factoryCount,
}: {
  pushPage: (p: Page) => void;
  factoryCount: number;
}) {
  return (
    <Command.Group heading="Categories">
      <Command.Item value="factories" onSelect={() => pushPage('factories')}>
        <div className="cmdk-item-icon">
          <IconHomeCog size={22} />
        </div>
        <div className="cmdk-item-content">
          <span className="cmdk-item-label">Factories</span>
          <span className="cmdk-item-description">
            {factoryCount} {factoryCount === 1 ? 'factory' : 'factories'} in the
            current game
          </span>
        </div>
        <IconChevronRight size={16} className="cmdk-item-chevron" />
      </Command.Item>

      <Command.Item value="items" onSelect={() => pushPage('items')}>
        <div className="cmdk-item-icon">
          <IconBox size={22} />
        </div>
        <div className="cmdk-item-content">
          <span className="cmdk-item-label">Items</span>
          <span className="cmdk-item-description">
            {validItems.length} producible items, resources, and materials
          </span>
        </div>
        <IconChevronRight size={16} className="cmdk-item-chevron" />
      </Command.Item>

      <Command.Item value="buildings" onSelect={() => pushPage('buildings')}>
        <div className="cmdk-item-icon">
          <IconBuildingFactory2 size={22} />
        </div>
        <div className="cmdk-item-content">
          <span className="cmdk-item-label">Buildings</span>
          <span className="cmdk-item-description">
            {AllFactoryBuildings.length} production buildings, logistics, and
            extractors
          </span>
        </div>
        <IconChevronRight size={16} className="cmdk-item-chevron" />
      </Command.Item>

      <Command.Item value="recipes" onSelect={() => pushPage('recipes')}>
        <div className="cmdk-item-icon">
          <IconToolsKitchen2 size={22} />
        </div>
        <div className="cmdk-item-content">
          <span className="cmdk-item-label">Recipes</span>
          <span className="cmdk-item-description">
            {AllFactoryRecipes.length} default, alternate, and MAM recipes
          </span>
        </div>
        <IconChevronRight size={16} className="cmdk-item-chevron" />
      </Command.Item>

      <Command.Item value="tiers" onSelect={() => pushPage('tiers')}>
        <div className="cmdk-item-icon">
          <IconStairsUp size={22} />
        </div>
        <div className="cmdk-item-content">
          <span className="cmdk-item-label">Tiers</span>
          <span className="cmdk-item-description">
            {TierGroups.length} HUB tiers and what each milestone unlocks
          </span>
        </div>
        <IconChevronRight size={16} className="cmdk-item-chevron" />
      </Command.Item>
    </Command.Group>
  );
}

function FactoriesPage({
  factories,
  select,
}: {
  factories: Factory[];
  select: (path: string) => void;
}) {
  return (
    <Command.Group heading="Factories">
      {factories.map(f => (
        <FactoryRow key={f.id} factory={f} select={select} />
      ))}
    </Command.Group>
  );
}

function ItemsPage({ select }: { select: (path: string) => void }) {
  return (
    <Command.Group heading="Items">
      {validItems.map(item => (
        <ItemRow key={item.id} item={item} select={select} />
      ))}
    </Command.Group>
  );
}

function BuildingsPage({ select }: { select: (path: string) => void }) {
  return (
    <Command.Group heading="Buildings">
      {AllFactoryBuildings.map(b => (
        <BuildingRow key={b.id} building={b} select={select} />
      ))}
    </Command.Group>
  );
}

function RecipesPage({ select }: { select: (path: string) => void }) {
  return (
    <Command.Group heading="Recipes">
      {AllFactoryRecipes.map(r => (
        <RecipeRow key={r.id} recipe={r} select={select} />
      ))}
    </Command.Group>
  );
}

function TiersPage({ select }: { select: (path: string) => void }) {
  return (
    <Command.Group heading="Tiers">
      {TierGroups.map(g => (
        <TierRow key={g.tier} group={g} select={select} />
      ))}
    </Command.Group>
  );
}

function UnifiedResultsPage({
  factories,
  select,
}: {
  factories: Factory[];
  select: (path: string) => void;
}) {
  return (
    <>
      {factories.length > 0 && (
        <Command.Group heading="Factories">
          {factories.map(f => (
            <FactoryRow key={f.id} factory={f} select={select} />
          ))}
        </Command.Group>
      )}
      <Command.Group heading="Items">
        {validItems.map(item => (
          <ItemRow key={item.id} item={item} select={select} />
        ))}
      </Command.Group>
      <Command.Group heading="Buildings">
        {AllFactoryBuildings.map(b => (
          <BuildingRow key={b.id} building={b} select={select} />
        ))}
      </Command.Group>
      <Command.Group heading="Recipes">
        {AllFactoryRecipes.map(r => (
          <RecipeRow key={r.id} recipe={r} select={select} />
        ))}
      </Command.Group>
      <Command.Group heading="Tiers">
        {TierGroups.map(g => (
          <TierRow key={g.tier} group={g} select={select} />
        ))}
      </Command.Group>
    </>
  );
}

function FactoryRow({
  factory: f,
  select,
}: {
  factory: Factory;
  select: (path: string) => void;
}) {
  const outputs = (f.outputs ?? []).filter(
    (o): o is typeof o & { resource: string } => Boolean(o?.resource),
  );
  return (
    <Command.Item
      value={`${f.name ?? 'Unnamed Factory'} ${f.id}`}
      keywords={outputs.map(o => o.resource)}
      onSelect={() => select(`/factories/${f.id}/calculator`)}
    >
      <div className="cmdk-item-icon">
        <IconHomeCog size={22} />
      </div>
      <div className="cmdk-item-content">
        <span className="cmdk-item-label">{f.name || 'Unnamed Factory'}</span>
        {outputs.length > 0 && (
          <span className="cmdk-item-outputs">
            {outputs.map((o, i) => {
              const item = AllFactoryItemsMap[o.resource];
              return (
                <span key={o.resource} className="cmdk-item-output">
                  {i > 0 && <span className="cmdk-item-output-sep">·</span>}
                  <FactoryItemImage id={o.resource} size={16} withTooltip />
                  <span>{item?.displayName ?? o.resource}</span>
                  {o.amount != null && (
                    <span className="cmdk-item-output-amount">
                      {o.amount}/min
                    </span>
                  )}
                </span>
              );
            })}
          </span>
        )}
      </div>
    </Command.Item>
  );
}

function ItemRow({
  item,
  select,
}: {
  item: FactoryItem;
  select: (path: string) => void;
}) {
  return (
    <Command.Item
      value={`${item.displayName} ${item.id}`}
      keywords={[item.name, item.form]}
      onSelect={() => select(`/codex/items/${item.id}`)}
    >
      <div className="cmdk-item-icon">
        <FactoryItemImage id={item.id} size={24} withTooltip />
      </div>
      <div className="cmdk-item-content">
        <span className="cmdk-item-label">{item.displayName}</span>
        <span className="cmdk-item-description">{item.form}</span>
      </div>
    </Command.Item>
  );
}

function BuildingRow({
  building: b,
  select,
}: {
  building: FactoryBuilding;
  select: (path: string) => void;
}) {
  const category = b.powerGenerator
    ? 'Power Generator'
    : b.extractor
      ? 'Extractor'
      : b.conveyor || b.pipeline
        ? 'Logistics'
        : 'Production';
  return (
    <Command.Item
      value={`${b.name} ${b.id}`}
      keywords={[category]}
      onSelect={() => select(`/codex/buildings/${b.id}`)}
    >
      <div className="cmdk-item-icon">
        <Image
          w={24}
          h={24}
          fit="contain"
          src={b.imagePath?.replace('_256', '_64')}
        />
      </div>
      <div className="cmdk-item-content">
        <span className="cmdk-item-label">{b.name}</span>
        <span className="cmdk-item-description">{category}</span>
      </div>
    </Command.Item>
  );
}

function RecipeRow({
  recipe: r,
  select,
}: {
  recipe: FactoryRecipe;
  select: (path: string) => void;
}) {
  return (
    <Command.Item
      value={`${r.name} ${r.id}`}
      keywords={r.products.map(p => p.resource)}
      onSelect={() => select(`/codex/recipes/${r.id}`)}
    >
      <div className="cmdk-item-icon">
        <FactoryItemImage id={r.products[0]?.resource} size={24} withTooltip />
      </div>
      <div className="cmdk-item-content">
        <span className="cmdk-item-label">{r.name}</span>
      </div>
    </Command.Item>
  );
}

function TierRow({
  group,
  select,
}: {
  group: TierGroup;
  select: (path: string) => void;
}) {
  const milestoneNames = group.schematics.map(s => s.name).join(', ');
  return (
    <Command.Item
      value={`Tier ${group.tier} ${milestoneNames}`}
      keywords={group.schematics.map(s => s.id)}
      onSelect={() => select(`/codex/tiers/${group.tier}`)}
    >
      <div className="cmdk-item-icon">
        <IconStairsUp size={22} />
      </div>
      <div className="cmdk-item-content">
        <span className="cmdk-item-label">Tier {group.tier}</span>
        <span className="cmdk-item-description">{milestoneNames}</span>
      </div>
    </Command.Item>
  );
}
