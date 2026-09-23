export type LevelView = 'slope' | 'bars';

/** Per-card controls, kept in the URL next to the filter state. */
export interface CardOptions {
  medianOfCompanies: boolean;
  levelView: LevelView;
}
