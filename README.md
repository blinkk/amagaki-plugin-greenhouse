# amagaki-plugin-greenhouse

[![NPM Version][npm-image]][npm-url]
[![GitHub Actions][github-image]][github-url]
[![TypeScript Style Guide][gts-image]][gts-url]

An Amagaki plugin for fetching content from Greenhouse. By default, content is
sanitized using [DOMPurify](https://github.com/cure53/DOMPurify).

## Usage

### As a plugin

1. Install the plugin.

```shell
npm install --save @amagaki/amagaki-plugin-greenhouse
```

2. Add to `amagaki.ts`.

```typescript
import {GreenhousePlugin} from '@amagaki/amagaki-plugin-greenhouse';
import {BuilderPlugin, Pod} from '@amagaki/amagaki';

export default (pod: Pod) => {
  // Sync Greenhouse prior to building.
  const builderPlugin = pod.plugins.get('BuilderPlugin') as BuilderPlugin;
  builderPlugin.addBeforeBuildStep(async () => {
    const greenhouse = GreenhousePlugin.register(pod, {
      boardToken: 'boardToken',
    });
    await greenhouse.bindCollection({
      collectionPath: '/content/jobs',
    });
    await greenhouse.saveEducationFile({
      podPath: '/content/partials/education.yaml',
    });
  });
};
```

### Via the CLI

This package is also distributed with a CLI so you can download Greenhouse job
board data without using Amagaki.

```
npx @amagaki/amagaki-plugin-greenhouse download \
  -b <boardToken> \
  -j <jobsCollectionPodPath> \
  -e <educationPodPath> \
  [root]
```

[github-image]: https://github.com/blinkk/amagaki-plugin-greenhouse/workflows/Run%20tests/badge.svg
[github-url]: https://github.com/blinkk/amagaki-plugin-greenhouse/actions
[npm-image]: https://img.shields.io/npm/v/@amagaki/amagaki-plugin-greenhouse.svg
[npm-url]: https://npmjs.org/package/@amagaki/amagaki-plugin-greenhouse
[gts-image]: https://img.shields.io/badge/code%20style-google-blueviolet.svg
[gts-url]: https://github.com/google/gts
