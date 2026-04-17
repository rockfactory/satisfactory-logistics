import { Image } from '@mantine/core';
import {
  IconBox,
  IconBuildingFactory2,
  IconChevronRight,
  IconHomeCog,
  IconToolsKitchen2,
} from '@tabler/icons-react';
import { Command } from 'cmdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Factory } from '@/factories/Factory';
import { useGameFactories } from '@/games/store/gameFactoriesSelectors';
import { AllFactoryBuildings } from '@/recipes/FactoryBuilding';
import {
  AllFactoryItems,
  AllFactoryItemsMap,
  FactoryItemForm,
} from '@/recipes/FactoryItem';
import { AllFactoryRecipes } from '@/recipes/FactoryRecipe';
import { FactoryItemImage } from '@/recipes/ui/FactoryItemImage';
import './cmdk.css';

type Page = 'items' | 'buildings' | 'recipes' | 'factories';

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

        {!page && (
          <RootPage pushPage={pushPage} factoryCount={factories.length} />
        )}
        {page === 'factories' && (
          <FactoriesPage factories={factories} select={select} />
        )}
        {page === 'items' && <ItemsPage select={select} />}
        {page === 'buildings' && <BuildingsPage select={select} />}
        {page === 'recipes' && <RecipesPage select={select} />}
      </Command.List>

      <div className="cmdk-footer">
        <span>{page === 'factories' ? 'Factories' : 'Codex'}</span>
        <span>
          {pages.length > 0 ? (
            <>
              <kbd>↩</kbd> select &nbsp; <kbd>⌫</kbd> back &nbsp; <kbd>esc</kbd>{' '}
              close
            </>
          ) : (
            <>
              <kbd>↩</kbd> select &nbsp; <kbd>esc</kbd> close
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
      {factories.map(f => {
        const outputs = (f.outputs ?? []).filter(
          (o): o is typeof o & { resource: string } => Boolean(o?.resource),
        );
        return (
          <Command.Item
            key={f.id}
            value={`${f.name ?? 'Unnamed Factory'} ${f.id}`}
            keywords={outputs.map(o => o.resource)}
            onSelect={() => select(`/factories/${f.id}/calculator`)}
          >
            <div className="cmdk-item-icon">
              <IconHomeCog size={22} />
            </div>
            <div className="cmdk-item-content">
              <span className="cmdk-item-label">
                {f.name || 'Unnamed Factory'}
              </span>
              {outputs.length > 0 && (
                <span className="cmdk-item-outputs">
                  {outputs.map((o, i) => {
                    const item = AllFactoryItemsMap[o.resource];
                    return (
                      <span key={o.resource} className="cmdk-item-output">
                        {i > 0 && (
                          <span className="cmdk-item-output-sep">·</span>
                        )}
                        <FactoryItemImage id={o.resource} size={16} />
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
      })}
    </Command.Group>
  );
}

function ItemsPage({ select }: { select: (path: string) => void }) {
  return (
    <Command.Group heading="Items">
      {validItems.map(item => (
        <Command.Item
          key={item.id}
          value={`${item.displayName} ${item.id}`}
          keywords={[item.name, item.form]}
          onSelect={() => select(`/codex/items/${item.id}`)}
        >
          <div className="cmdk-item-icon">
            <FactoryItemImage id={item.id} size={24} />
          </div>
          <div className="cmdk-item-content">
            <span className="cmdk-item-label">{item.displayName}</span>
            <span className="cmdk-item-description">{item.form}</span>
          </div>
        </Command.Item>
      ))}
    </Command.Group>
  );
}

function BuildingsPage({ select }: { select: (path: string) => void }) {
  return (
    <Command.Group heading="Buildings">
      {AllFactoryBuildings.map(b => {
        const category = b.powerGenerator
          ? 'Power Generator'
          : b.extractor
            ? 'Extractor'
            : b.conveyor || b.pipeline
              ? 'Logistics'
              : 'Production';
        return (
          <Command.Item
            key={b.id}
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
      })}
    </Command.Group>
  );
}

function RecipesPage({ select }: { select: (path: string) => void }) {
  return (
    <Command.Group heading="Recipes">
      {AllFactoryRecipes.map(r => (
        <Command.Item
          key={r.id}
          value={`${r.name} ${r.id}`}
          keywords={r.products.map(p => p.resource)}
          onSelect={() => select(`/codex/recipes/${r.id}`)}
        >
          <div className="cmdk-item-icon">
            <FactoryItemImage id={r.products[0]?.resource} size={24} />
          </div>
          <div className="cmdk-item-content">
            <span className="cmdk-item-label">{r.name}</span>
          </div>
        </Command.Item>
      ))}
    </Command.Group>
  );
}
