import type { DriveStep } from 'driver.js';

export interface TutorialChapter {
  id: string;
  title: string;
  description: string;
  route: string;
  steps: DriveStep[];
}
