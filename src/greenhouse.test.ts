import {ExecutionContext} from 'ava';
import {GreenhousePlugin} from './greenhouse';
import {Pod} from '@amagaki/amagaki';
import test from 'ava';

test('Test GreenhousePlugin', async (t: ExecutionContext) => {
  const pod = new Pod('../example');
  const greenhouse = GreenhousePlugin.register(pod, {
    boardToken: 'vaulttec',
  });
  await greenhouse.bindCollection({
    collectionPath: '/content/jobs',
  });
  await greenhouse.saveEducationFile({
    podPath: '/content/partials/education.yaml',
  });
  t.pass();
});

test('Test getDepartments', async (t: ExecutionContext) => {
  const pod = new Pod('../example');
  const greenhouse = GreenhousePlugin.register(pod, {
    boardToken: 'vaulttec',
  });
  const resp = await greenhouse.getDepartments();
  t.truthy(resp);
});

test('Test getOffices', async (t: ExecutionContext) => {
  const pod = new Pod('../example');
  const greenhouse = GreenhousePlugin.register(pod, {
    boardToken: 'vaulttec',
  });
  const resp = await greenhouse.getOffices();
  t.truthy(resp);
});
