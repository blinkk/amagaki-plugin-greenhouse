import {DownloadCommand} from './commands';
import {ExecutionContext} from 'ava';
import path from 'path';
import test from 'ava';

const root = path.join(__dirname, '..', 'test');

test('Run command', async (t: ExecutionContext) => {
  const cmd = new DownloadCommand({
    boardToken: 'vaulttec',
    jobsCollectionPodPath: '/content/jobs',
    educationPodPath: '/content/partials/education.yaml',
  });
  await cmd.run(root);
  t.pass();
});
