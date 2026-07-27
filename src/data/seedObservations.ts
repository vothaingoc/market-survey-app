import { SeedObservation } from './seedData';

import osakaSeedJson from './osaka_full_survey_seed.json';

export const SEED_OBSERVATIONS: SeedObservation[] = (osakaSeedJson as any).observations || [];
