/*
 * @mineralts/index.ts
 *
 * (c) Parmantier Baptiste
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 */

import { CommandOption, Snowflake } from '@mineralts/api'

export type CommandContext = {
  label: string
  scope: 'GUILD' | Snowflake
  description: string
  options: CommandOption<any>[]
}