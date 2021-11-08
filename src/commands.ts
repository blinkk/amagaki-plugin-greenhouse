import {GreenhousePlugin} from '.';
import {Pod} from '@amagaki/amagaki';

interface DownloadOptions {
  boardToken: string;
  jobsCollectionPodPath: string;
  educationPodPath: string;
}

export class DownloadCommand {
  private readonly options: DownloadOptions;

  constructor(options: DownloadOptions) {
    this.options = options;
  }

  async run(path = './') {
    const pod = new Pod(path);
    const greenhouse = GreenhousePlugin.register(pod, {
      boardToken: this.options.boardToken,
    });
    await Promise.all([
      greenhouse.bindCollection({
        collectionPath: this.options.jobsCollectionPodPath,
      }),
      greenhouse.saveEducationFile({
        podPath: this.options.educationPodPath,
      }),
    ]);
  }
}
