import {BuilderPlugin, Pod} from '@amagaki/amagaki';

// eslint-disable-next-line node/no-unpublished-import
import {GreenhousePlugin} from '../dist';

export default async (pod: Pod) => {
  const builderPlugin = pod.plugins.get('BuilderPlugin') as BuilderPlugin;
  builderPlugin.addBeforeBuildStep(async () => {
    const plugin = GreenhousePlugin.register(pod, {
      boardToken: 'token',
    });
    await plugin.bindCollection({
      collectionPath: '/content/jobs',
    });
  });
};
