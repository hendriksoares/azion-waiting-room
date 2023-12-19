import add from 'date-fns/add';
import { mainPageTemplate } from './pages/main.page';

export class WaitingRoomService {
  private ticket: any;
  private ttl = 10;
  private capacity = 1;

  private url: string;
  private token: string;

  constructor(event: any) {
    this.token = event.args.token;
    this.url = event.args.url;
  }

  public async run(event: any): Promise<any> {
    const { pathname } = new URL(event.request.url);
    if (!pathname.startsWith('/favico')) {
      // 1. Get or generate ticket.
      this.getTicket(event);

      // 2. Check if has available space in main room.
      const size = await this.checkSize();

      // 3. If has space move the waiting to main room.
      if (size > 0) {
        await this.moveToMainRoom(size);
      }

      // 4. Check if current ticket was in main room.
      const hasAccess = await this.verifyMain();
      if (hasAccess) {
        return this.mainPage();
      }

      // 5. If not, check if its in waiting room.
      const position = await this.verifyWait();

      // 6. Return waiting room.
      return this.waitPage(position);
    }
  }

  private async waitPage(position: number): Promise<Response> {
    const response = new Response(`Waiting page ! Position: ${position}`, {
      headers: {
        'content-type': 'application/json;charset=UTF-8',
      },
      status: 200,
    });

    response.headers.append(
      'Set-Cookie',
      `x-ticket=${JSON.stringify(this.ticket)}; path=/`,
    );

    return response;
  }

  private async mainPage(): Promise<Response> {
    // update the ttl before send result
    this.ticket.ttl = add(new Date(), { seconds: this.ttl });

    await this.addToMain(this.ticket);

    const response = new Response(mainPageTemplate(this.ticket.ttl), {
      headers: {
        'content-type': 'text/html;charset=UTF-8',
      },
      status: 200,
    });

    response.headers.append(
      'Set-Cookie',
      `x-ticket=${JSON.stringify(this.ticket)}; path=/`,
    );

    return response;
  }

  private async execute(command: string) {
    const result = await fetch(`${this.url}/${command}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    });

    return (await result.json()).result;
  }

  private async verifyWait(): Promise<number> {
    const position = await this.execute(`lpos/room:wait/${this.ticket.key}`);
    if (position >= 0 && position != null) {
      return position + 1;
    }
    return await this.addToWait();
  }

  private async verifyMain(): Promise<boolean> {
    const result = await this.execute(`get/${this.ticket.key}`);
    return result ? true : false;
  }

  private async moveToMainRoom(total: number): Promise<void> {
    const tickets = await this.execute(`lrange/room:wait/0/${total - 1}`);
    await this.execute(`ltrim/room:wait/${total}/-1`);

    if (tickets) {
      tickets.forEach(async (t: string) => {
        const input = {
          key: t,
          ttl: add(new Date(), { seconds: this.ttl }),
        };
        await this.addToMain(input);
      });
    }

    if (tickets.length < total) {
      await this.addToMain(this.ticket);
    }
  }

  private async addToMain(ticket: any): Promise<void> {
    await this.execute(
      `set/${ticket.key}/${JSON.stringify(ticket)}/ex/${this.ttl}`,
    );
  }

  private async addToWait() {
    return await this.execute(`rpush/room:wait/${this.ticket.key}`);
  }

  private async checkSize(): Promise<number> {
    const mainSize = await this.execute('dbsize');
    const waitSize = await this.execute(`llen/room:wait`);
    return waitSize > 0
      ? this.capacity - mainSize + 1
      : this.capacity - mainSize;
  }

  private getTicket(event: any): void {
    const cookie = this.parse(event.request.headers.get('Cookie'));
    if (cookie['x-ticket']) {
      this.ticket = JSON.parse(cookie['x-ticket']);
    } else {
      this.ticket = {
        key: crypto.randomUUID(),
        ttl: add(new Date(), { seconds: this.ttl }),
      };
    }
  }

  private parse(str: string) {
    if (typeof str !== 'string') {
      return {};
    }

    const result = str
      .split(';')
      .map((v) => v.split('='))
      .reduce((acc, v) => {
        acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
        return acc;
      }, {});
    return result;
  }
}
