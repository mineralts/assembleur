import Connector from '@mineralts/connector'
import Application from '@mineralts/application'
import { fetch } from 'fs-recursive'
import { join } from 'path'
import { MineralEvent } from '@mineralts/core'
import EventsListener from './listeners/EventsListener'

export default class Assembler {
  private eventListener: EventsListener = new EventsListener()

  constructor (private application: Application) {
  }

  public async build () {
    const connector = new Connector(this.application)
    connector.http.defineHeaders({ Authorization: `Bot ${this.application.token}` })

    await connector.socket.connect()
    connector.socket.dispatch((payload) => {
      // Emit les events
      this.eventListener.emit(payload.t?.toLowerCase(), '')
    })

    await this.register()
  }

  public async register () {
    const files = await fetch(
      join(this.application.appRoot, 'src'),
      [this.application.mode === 'production' ? 'js' : 'ts'],
      'utf-8',
      ['node_modules', 'build', 'export']
    )

    for (const [, file] of files) {
      const { default: item } = await import(file.path)
      this.dispatch(file.path, item)
    }
  }

  private dispatch (path, item) {
    const identifiers = {
      event: () => this.registerEvent(path, item),
    }

    if (item.identifier in identifiers) {
      identifiers[item.identifier]()
    }
  }

  protected registerEvent (path, item: { new(): MineralEvent, event: string }): void {
    const event = new item() as MineralEvent & { event: string }
    event.logger = this.application.logger

    const eventContainer = this.application.container.events.get(item.event)

    if (!eventContainer) {
      const eventMap = new Map().set(path, event)
      this.application.container.events.set(item.event, eventMap)
    } else {
      eventContainer.set(path, event)
    }

    this.eventListener.listen(item.event, event)
  }
}