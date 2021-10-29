import chalk from 'chalk'
import { resolve, join } from 'path'
import git from 'simple-git'
import dbg from 'debug'
import { EventEmitter } from 'events'
import Executor from '../executor'
import Steps from '../steps'
import pkgm from '../package-manager'
import {
  KoObservable,
  KoEventEmitter,
  KoEventType,
  KoEvents,
} from '../../types/events'

const debug = dbg('ko:packages:generator')

import { ExecutorOptions } from '../executor'
import { mkdir } from 'shelljs'
import {existsSync} from "fs";
export interface GeneratorOptions extends ExecutorOptions {
  name: string
  framework: string
}

export class Generator extends Steps implements KoObservable {
  private readonly observable = new EventEmitter() as KoEventEmitter
  readonly executor: Executor
  constructor(readonly options: GeneratorOptions) {
    super()
    this.options = options
    this.executor = new Executor(this._steps, {
      ...this.options,
    })
  }

  /* istanbul ignore next */
  subscribe<T extends KoEventType>(event: T, listener: KoEvents[T]) {
    /* istanbul ignore next */
    this.observable.on<T>(event, listener)
    /* instabul ignore next */
    return this
  }

  /* istanbul ignore next */
  subscribeOnce<T extends KoEventType>(event: T, listener: KoEvents[T]) {
    /* istanbul ignore next */
    this.observable.once<T>(event, listener)
    /* instabul ignore next */
    return this
  }

  /* istanbul ignore next */
  unsubscribe<T extends KoEventType>(event: T, listener: KoEvents[T]) {
    /* istanbul ignore next */
    this.observable.off<T>(event, listener)
    /* instabul ignore next */
    return this
  }

  /* istanbul ignore next */
  unsubscribeAll<T extends KoEventType>(event?: T) {
    /* istanbul ignore next */
    this.observable.removeAllListeners(event)
    /* instabul ignore next */
    return this
  }

  /**
   * Initialize the application
   */
  private async init() {
    let cwd = this.options.cwd || process.cwd()

    debug(`Initializing at ${join(cwd, this.options.name)}`)

    if (cwd !== this.options.path) {
      debug(`Creating directory ${this.options.name} at ${cwd}`)
      cwd = join(cwd, this.options.name)
      mkdir('-p', cwd)
      debug(`Changing directory to ${cwd}`)
      // Change directory
      process.chdir(cwd)
    }
    debug(`Initializing package.json`)
    // Initialize package.json
    await pkgm().initSync()
    // Initialize git if it doesn't exist
    if (this.options.git && !existsSync(join(cwd, '.git'))) {
      debug(`Initializing git at ${cwd}`)
      await git(cwd).init()
    }

    return this
  }

  /**
   * Generate the application
   */
  async generate() {
    this.observable.emit('start')
    this.observable.emit(
      'event',
      `Creating a ✨ ${chalk.cyan('shiny')} ✨ new ${
        this.options.framework
      } app in ${chalk.green(resolve(this.options.name))}`
    )

    await this.init()
    await this.executor.run()
    await this.#commit()

    /* istanbul ignore next */
    this.observable.emit('event', `${chalk.green('Success!')} 🎉`)
    if (this.options.cwd !== this.options.path) {
      /* istanbul ignore next */
      this.observable.emit(
        'event',
        `${chalk.cyan('cd')} into ${chalk.green(
          this.options.name
        )} and start developing!`
      )
    }
    /* istanbul ignore next */
    this.observable.emit('end')
    return this
  }

  #commit = async () => {
    /* istanbul ignore next */
    if (this.options.git && existsSync(join(this.options.path || '', '.git'))) {
      /* istanbul ignore next */
      debug(`Adding "Add initial files" to commit at ${this.options.path}`)
      /* instabul ignore next */
      await git(this.options.path).add('*')
      // Add the changes to the commit
      /* instabul ignore next */
      await git(this.options.path).commit('Add initial files')
    }
  }
}

export default function generator(options: GeneratorOptions) {
  return new Generator(options)
}
