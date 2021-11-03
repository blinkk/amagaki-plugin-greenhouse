import {BuilderPlugin, Pod} from '@amagaki/amagaki';

// eslint-disable-next-line node/no-unpublished-import
import {GreenhousePlugin} from '../dist';

export default async (pod: Pod) => {
  const greenhouse = GreenhousePlugin.register(pod, {
    boardToken: 'boardToken',
  });
  const builderPlugin = pod.plugins.get('BuilderPlugin') as BuilderPlugin;
  builderPlugin.addBeforeBuildStep(async () => {
    // Save jobs to documents within a collection.
    await greenhouse.bindCollection({
      collectionPath: '/content/jobs',
    });
    // Save schools to a partial document.
    const schools = await greenhouse.getSchools();
    await pod.writeFileAsync(
      '/content/partials/schools.yaml',
      pod.dumpYaml(schools)
    );
  });
};
