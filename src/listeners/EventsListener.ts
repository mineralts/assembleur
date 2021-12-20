import EventEmitter from 'events'
import { MineralEvent } from '@mineralts/core'

export default class EventsListener extends EventEmitter {
  public listen (event: string, Class: MineralEvent) {
    this.on(event, async (...args: any[]) => {
      await Class.run(...args)
    })
  }
}