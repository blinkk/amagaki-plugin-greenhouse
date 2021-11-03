# amagaki-plugin-greenhouse

[![NPM Version][npm-image]][npm-url]
[![GitHub Actions][github-image]][github-url]
[![TypeScript Style Guide][gts-image]][gts-url]

An Amagaki plugin for fetching content from Greenhouse.

## Usage

1. Install the plugin.

```shell
npm install --save @amagaki/amagaki-plugin-greenhouse
```

2. Add to `amagaki.ts`.

```typescript
import {GreenhousePlugin} from '@amagaki/amagaki-plugin-greenhouse';
import {BuilderPlugin, Pod} from '@amagaki/amagaki';

export default (pod: Pod) => {
  // Initialize the Greenhouse plugin.
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

```

[github-image]: https://github.com/blinkk/amagaki-plugin-greenhouse/workflows/Run%20tests/badge.svg
[github-url]: https://github.com/blinkk/amagaki-plugin-greenhouse/actions
[npm-image]: https://img.shields.io/npm/v/@amagaki/amagaki-plugin-greenhouse.svg
[npm-url]: https://npmjs.org/package/@amagaki/amagaki-plugin-greenhouse
[gts-image]: https://img.shields.io/badge/code%20style-google-blueviolet.svg
[gts-url]: https://github.com/google/gts
