import dbg from 'debug'
import { join, resolve } from 'path'
import { mkdir, touch } from 'shelljs'
import { promisify } from 'util'
// import { write, read, readJSON, writeJSON } from '@ko/utils/fs'
// import generator from '@ko/generator'
import { FrameworkFactory } from '../types'
import generator from '../../generator'
import { readSync, writeSync, readJSONSync, writeJSONSync } from '../../utils/fs'
import { template } from 'lodash'

const GithubContent = require('github-content')

const debug = dbg('ko:packages:frameworks:next')

const gc = new GithubContent({
  owner: 'github',
  repo: 'gitignore',
})

const download: (param: any) => Promise<{
  path: string
  contents: Buffer
}> = promisify(gc.file) as any

const factory: FrameworkFactory = ({
  name,
  version,
  typescript,
  dryRun = false,
  cwd,
  git,
  ...rest
}) => {
  const templatesPath = join(__dirname, 'templates')

  return generator({
    ...rest,
    name,
    framework: 'next',
    cwd,
    dryRun,
    git,
  })
    .addDependencyStep({
      name: 'Add initial dependencies',
      packages: [
        { name: 'next', version },
        {
          name: 'react',
          version: version?.includes('9') ? '16.x' : version || 'latest',
        },
        {
          name: 'react-dom',
          version: version?.includes('9') ? '16.x' : version || 'latest',
        },
        ...(typescript
          ? [
              { name: 'typescript', dev: true },
              { name: '@types/node', dev: true },
              { name: '@types/react', dev: true },
            ]
          : []),
      ],
    })
    .addCustomStep({
      name: 'Add scripts to package.json',
      run: () => {
        const pkgPath = resolve('package.json')
        const pkg = readJSONSync(pkgPath)
        writeJSONSync(pkgPath, {
          ...pkg,
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
          },
        })
      },
    })
    .addCustomStep({
      name: 'Add next.config.js',
      run: () => {
        debug('Creating next.config.json')
        writeSync(
          resolve('next.config.js'),
          readSync(join(templatesPath, 'next.config.txt'))
        )
      },
    })
    .addCustomStep({
      name: 'Initialize tsconfig.json',
      run: () => {
        debug('Creating tsconfig.json')
        touch('tsconfig.json')
      },
      condition: typescript !== false,
    })
    .addCustomStep({
      name: 'Create the directories',
      run: () => {
        // Create the directories
        debug('Creating next directories')
        mkdir('-p', 'assets', 'components', 'pages', 'public', 'styles')
      },
    })
    .addCustomStep({
      name: 'Create initial pages',
      run: () => {
        // Create the initial pages
        debug('Creating files under pages/')
        const pages = ['_app.txt', '_document.txt', 'index.txt']

        for (const file of pages) {
          const script = file.replace('txt', typescript ? 'tsx' : 'js')
          const page = readSync(join(templatesPath, `pages/${file}`))
          writeSync(resolve(`pages/${script}`), template(page)({ name }))
        }
      },
    })
    .addCustomStep({
      name: 'Create the initial styles',
      run: () => {
        // Create the initial styles
        debug('Creating files under styles/')
        const styles = ['globals.css', 'home.module.css']
        for (const file of styles) {
          writeSync(
            resolve(`styles/${file}`),
            readSync(join(templatesPath, `styles/${file}`))
          )
        }
      },
    })
    .addCustomStep({
      name: 'Initialize .gitignore',
      run: async () => {
        // Download the latest gitignore for node
        debug('Downloading .gitignore for node')
        const gitignore = await download.apply(gc, ['Node.gitignore'])
        // Write the .gitignore file
        debug(`Writing .gitignore to ${process.cwd()}`)
        writeSync(resolve('.gitignore'), gitignore.contents.toString('utf-8'))
      },
    })
}

export default factory
