export interface ConveyorNode {
  id: string;
  type: 'source' | 'splitter' | 'merger' | 'smart_splitter' | 'target';
  /** Flow rate in items/min at this node */
  holding: number;
  children: ConveyorLink[];
  parents: ConveyorLink[];
  /** For smart splitters, describes the filter rule */
  smartRule?: 'item_filter' | 'overflow' | 'any';
  label?: string;
}

export interface ConveyorLink {
  from: ConveyorNode;
  to: ConveyorNode;
  /** Items/min flowing through this link */
  carrying: number;
}

export interface SplitterInput {
  rate: number;
  count: number;
}

export interface SplitterTarget {
  rate: number;
  count: number;
  /** If set, this output uses a smart splitter filter */
  itemFilter?: string;
  /** If true, this output receives overflow */
  isOverflow?: boolean;
}

export interface SplitterRequest {
  sources: SplitterInput[];
  targets: SplitterTarget[];
  maxBeltSpeed: number;
  allowSmartSplitters: boolean;
}

export interface RateApproximation {
  targetIndex: number;
  requestedRate: number;
  actualRate: number;
  /** Signed deviation as a fraction, e.g. 0.004 = +0.4% */
  deviation: number;
}

export interface SplitterResult {
  nodes: ConveyorNode[];
  links: ConveyorLink[];
  error?: string;
  approximations?: RateApproximation[];
}

export interface BeltTier {
  name: string;
  speed: number;
}
