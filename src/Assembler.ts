import { Connector } from '@mineralts/connector'
import Application from '@mineralts/application'
import { fetch } from 'fs-recursive'
import { join } from 'path'
import { MineralEvent, PacketManager } from '@mineralts/core'
import { Client } from '@mineralts/api'
import EventsListener from './listeners/EventsListener'
import fs from 'fs'

export default class Assembler {
  public readonly eventListener: EventsListener = new EventsListener()
  public connector!: Connector

  constructor (public application: Application, private packetManager: PacketManager) {
  }

  public async build () {
    this.connector = new Connector(this.application)
    this.connector.http.defineHeaders({ Authorization: `Bot ${this.application.token}` })

    await this.connector.socket.connect()
    this.connector.socket.dispatch(async (payload) => {
      const packets = this.packetManager.resolve(payload.t)

      if (packets?.length) {
        await Promise.all(
          packets.map(async (packet) => (
            packet?.handle(this, payload.d)
          ))
        )
      }
    })
  }

  public async register () {
    const files = await fetch(
      join(this.application.appRoot, 'src'),
      [this.application.mode === 'production' ? 'js' : 'ts'],
      'utf-8',
      ['node_modules', 'build', 'export']
    )

    for (const [, file] of files) {
      const content = await fs.promises.readFile(file.path, 'utf8')
      if (!content.startsWith('// mineral-ignore')) {
        const { default: item } = await import(file.path)
        this.dispatch(file.path, item)
      }
    }
  }

  private dispatch (path, item) {
    const identifiers = {
      event: () => this.registerEvent(path, item),
    }

    if (item && item.identifier in identifiers) {
      identifiers[item.identifier]()
    }
  }

  protected registerEvent (path, item: { new(): MineralEvent, event: string }): void {
    const event = new item() as MineralEvent & { event: string, client: Client }
    event.logger = this.application.logger
    event.client = this.application.client

    const eventContainer = this.application.container.events.get(item.event)

    if (!eventContainer) {
      const eventMap = new Map().set(path, event)
      this.application.container.events.set(item.event, eventMap)
    } else {
      eventContainer.set(path, event)
    }

    this.eventListener.on(item.event, async (...args: any[]) => {
      await event.run(...args)
    })
  }
}