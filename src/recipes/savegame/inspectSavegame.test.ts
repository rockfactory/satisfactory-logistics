import type { SatisfactorySave } from '@etothepii/satisfactory-file-parser';
import { describe, expect, it } from 'vitest';
import {
  createInspectAccumulator,
  finalizeInspect,
  inspectCollectableRef,
  inspectSavegame,
  isObjectReference,
} from './inspectSavegame';

function makeRef(pathName: string, levelName = 'L') {
  return { levelName, pathName };
}

describe('isObjectReference', () => {
  it('matches `Level.collectables` refs and rejects `SaveEntity` shapes', () => {
    expect(
      isObjectReference(makeRef('Persistent_Level:PersistentLevel.X')),
    ).toBe(true);
    expect(
      isObjectReference({ typePath: '/Game/...', instanceName: 'X' }),
    ).toBe(false);
    expect(isObjectReference(null)).toBe(false);
    expect(isObjectReference('plain string')).toBe(false);
  });
});

describe('inspectCollectableRef', () => {
  it('extracts the trailing segment of `pathName` (matches static dataset id format)', () => {
    const acc = createInspectAccumulator();
    inspectCollectableRef(
      acc,
      makeRef('Persistent_Level:PersistentLevel.BP_WAT130'),
    );
    inspectCollectableRef(
      acc,
      makeRef('Persistent_Level:PersistentLevel.BP_Crystal_mk2_3'),
    );
    inspectCollectableRef(
      acc,
      makeRef(
        'Persistent_Level:PersistentLevel.BP_WAT2_C_UAID_04421A9713F0C46101_1232106098',
      ),
    );
    expect([...acc.collectedCollectibleIds].sort()).toEqual([
      'BP_Crystal_mk2_3',
      'BP_WAT130',
      'BP_WAT2_C_UAID_04421A9713F0C46101_1232106098',
    ]);
  });

  it('keeps non-pickup refs (filtered later by the slice via static id intersection)', () => {
    const acc = createInspectAccumulator();
    inspectCollectableRef(
      acc,
      makeRef(
        'Persistent_Level:PersistentLevel.BP_MercerShrine_C_UAID_40B076DF2F794AB101_1454510103',
      ),
    );
    expect(acc.collectedCollectibleIds.size).toBe(1);
  });

  it('ignores malformed references', () => {
    const acc = createInspectAccumulator();
    inspectCollectableRef(acc, undefined);
    inspectCollectableRef(acc, null);
    inspectCollectableRef(acc, { levelName: 'L' });
    inspectCollectableRef(acc, { pathName: '' });
    expect(acc.collectedCollectibleIds.size).toBe(0);
  });
});

describe('inspectSavegame collectables flow', () => {
  it('reads `level.collectables` instead of inferring from `objects` absence', () => {
    // Two sublevels: one with a collected somersloop, one with an
    // uncollected somersloop actor still in `objects`. Under the old
    // absence-as-collected scheme, the latter would suppress the
    // second somersloop from "collected" (correct) but would also
    // mass-mark every other static id as "collected" (the bug). The
    // new flow yields exactly the one ref that's in `collectables`.
    const save: Partial<SatisfactorySave> = {
      levels: {
        sub1: {
          name: 'sub1',
          collectables: [makeRef('Persistent_Level:PersistentLevel.BP_WAT24')],
          objects: [],
          writesDestroyedActorsInTOCBlob: false,
        },
        sub2: {
          name: 'sub2',
          collectables: [],
          // An uncollected somersloop actor — must NOT show up as collected.
          objects: [
            {
              type: 'SaveEntity',
              typePath: '/Game/FactoryGame/Prototype/WAT/BP_WAT1.BP_WAT1_C',
              instanceName: 'Persistent_Level:PersistentLevel.BP_WAT17_30',
              rootObject: '',
              properties: {},
              specialProperties: { type: 'EmptySpecialProperties' },
              trailingData: [],
              saveCustomVersion: 0,
              shouldMigrateObjectRefsToPersistent: false,
            } as unknown as SatisfactorySave['levels'][string]['objects'][number],
          ],
          writesDestroyedActorsInTOCBlob: false,
        },
      } as SatisfactorySave['levels'],
    };
    const summary = inspectSavegame(save as SatisfactorySave);
    expect(summary.collectedCollectibleIds).toEqual(['BP_WAT24']);
  });

  it('survives a level missing the `collectables` field', () => {
    const save: Partial<SatisfactorySave> = {
      levels: {
        sub1: {
          name: 'sub1',
          objects: [],
          writesDestroyedActorsInTOCBlob: false,
        } as unknown as SatisfactorySave['levels'][string],
      } as SatisfactorySave['levels'],
    };
    expect(() => inspectSavegame(save as SatisfactorySave)).not.toThrow();
  });
});

describe('finalizeInspect', () => {
  it('produces the wire-shape `collectedCollectibleIds` array', () => {
    const acc = createInspectAccumulator();
    acc.collectedCollectibleIds.add('BP_WAT130');
    acc.collectedCollectibleIds.add('BP_WAT130');
    acc.collectedCollectibleIds.add('BP_WAT24');
    expect(finalizeInspect(acc).collectedCollectibleIds.sort()).toEqual([
      'BP_WAT130',
      'BP_WAT24',
    ]);
  });
});
