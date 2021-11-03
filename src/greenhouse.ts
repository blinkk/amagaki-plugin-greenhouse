import * as async from 'async';

import {Builder, interpolate} from '@amagaki/amagaki';

import {Pod} from '@amagaki/amagaki';
import fetch from 'node-fetch';
import fs from 'fs';
import fsPath from 'path';

export interface GreenhousePluginOptions {
  boardToken: string;
}

export interface BindCollectionOptions {
  collectionPath: string;
}

interface GreenhouseJobsResponseMeta {
  total: number;
}

interface GreenhouseJob {
  absolute_url: string;
  data_compliance: any[];
  internal_job_id: number;
  location: any;
  metadata: any[];
  id: number;
  updated_at: string;
  requisition_id: string;
  title: string;
  content: string;
  departments: any[];
  offices: any[];
}

export interface GreenhouseJobsResponse {
  jobs: GreenhouseJob[];
  meta: GreenhouseJobsResponseMeta;
}

const DEFAULT_SANITIZATION_SETTINGS = {
  allowedAttributes: [{tag: 'a', attributes: ['href', 'src']}],
  allowedTags: [
    'a',
    'b',
    'br',
    'em',
    'hr',
    'i',
    'img',
    'li',
    'ol',
    'p',
    'span',
    'strong',
    'sub',
    'sup',
    'u',
    'ul',
    'video',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
  ],
};

export class GreenhousePlugin {
  options: GreenhousePluginOptions;
  pod: Pod;

  static CONCURRENT_REQUESTS = 20;

  static DEGREES_URL =
    'https://api.greenhouse.io/v1/boards/${boardToken}/education/degrees';
  static DEPARTMENTS_URL =
    'https://api.greenhouse.io/v1/boards/${boardToken}/departments';
  static DISCIPLINES_URL =
    'https://api.greenhouse.io/v1/boards/${boardToken}/education/disciplines';
  static JOBS_URL =
    'https://api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true';
  static JOB_URL =
    'https://api.greenhouse.io/v1/boards/${boardToken}/jobs/${jobId}?questions=true';
  static SCHOOLS_URL =
    'https://api.greenhouse.io/v1/boards/${boardToken}/education/schools';

  constructor(pod: Pod, options: GreenhousePluginOptions) {
    this.pod = pod;
    this.options = options;
  }

  static register(pod: Pod, options: GreenhousePluginOptions) {
    return new GreenhousePlugin(pod, options);
  }

  async getJobs() {
    const url = interpolate(this.pod, GreenhousePlugin.JOBS_URL, {
      boardToken: this.options.boardToken,
    });
    const response = await fetch(url);
    return (await response.json()) as GreenhouseJobsResponse;
  }

  async getJob(jobId: number) {
    const url = interpolate(this.pod, GreenhousePlugin.JOB_URL, {
      boardToken: this.options.boardToken,
      jobId: jobId,
    });
    const response = await fetch(url);
    return await response.json();
  }

  async bindCollection(options: BindCollectionOptions) {
    const realPath = this.pod.getAbsoluteFilePath(options.collectionPath);
    // `ensureDirectoryExists` is actually `ensureDirectoryExistsForFile`.
    Builder.ensureDirectoryExists(fsPath.join(realPath, '_collection.yaml'));
    const existingFiles = fs.readdirSync(realPath).filter(path => {
      return !path.startsWith('_');
    });
    const newFiles: string[] = [];

    // Download all jobs.
    const resp = await this.getJobs();
    const jobResponses: any[] = [];
    console.log(
      `Downloading ${resp.meta.total} jobs from Greenhouse board -> ${this.options.boardToken}`
    );
    await async.eachLimit(
      resp.jobs,
      GreenhousePlugin.CONCURRENT_REQUESTS,
      async (job: GreenhouseJob) => {
        newFiles.push(`${job.id}.yaml`);
        jobResponses.push(await this.getJob(job.id));
      }
    );

    // Delete existing files in the collection.
    const diff = existingFiles.filter(basename => !newFiles.includes(basename));
    for (const basename of diff) {
      const absPath = fsPath.join(realPath, basename);
      const podPath = fsPath.join(options.collectionPath, basename);
      fs.unlinkSync(absPath);
      console.log(`Deleted -> ${podPath}`);
    }

    for (const job of jobResponses) {
      const basename = `${job.id}.yaml`;
      const podPath = fsPath.join(options.collectionPath, basename);
      await this.pod.writeFileAsync(podPath, this.pod.dumpYaml(job));
    }
  }
}
