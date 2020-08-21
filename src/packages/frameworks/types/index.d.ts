// import { Generator } from '@ko/generator'
// import { CreateContext } from '@ko/types/contexts'
// import { GeneratorOptions } from '@ko/generator/types'

import { CreateContext } from '../../../types/contexts'
import { GeneratorOptions } from '../../generator/types'
import { Generator } from '../../generator'

export type FrameworkFactory = (
  context: Omit<CreateContext, 'framework'> & GeneratorOptions
) => Generator
