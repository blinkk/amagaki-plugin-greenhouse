import {BuilderPlugin, Pod} from '@amagaki/amagaki';

// eslint-disable-next-line node/no-unpublished-import
import {GreenhousePlugin} from '../dist';

export default async (pod: Pod) => {
  const builderPlugin = pod.plugins.get('BuilderPlugin') as BuilderPlugin;
  builderPlugin.addBeforeBuildStep(async () => {
    const greenhouse = GreenhousePlugin.register(pod, {
      boardToken: 'vaulttec',
    });
    await greenhouse.bindCollection({
      collectionPath: '/content/jobs',
    });
    await greenhouse.saveEducationFile({
      podPath: '/content/partials/education.yaml',
    });
  });
};
