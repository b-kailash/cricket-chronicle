import { ChildProcess, spawn } from 'child_process';
import path from 'path';

class AdminService {
  private studioProcess: ChildProcess | null = null;
  private studioPort = 5555;

  getStudioStatus(): { running: boolean; port: number } {
    const running = this.studioProcess !== null && this.studioProcess.exitCode === null;
    return { running, port: this.studioPort };
  }

  async startStudio(): Promise<{ running: boolean; port: number }> {
    if (this.studioProcess && this.studioProcess.exitCode === null) {
      return { running: true, port: this.studioPort };
    }

    this.studioProcess = spawn(
      'npx',
      ['prisma', 'studio', '--port', String(this.studioPort), '--browser', 'none'],
      {
        cwd: path.resolve(__dirname, '../..'),
        stdio: 'pipe',
        env: { ...process.env },
      }
    );

    this.studioProcess.on('error', (err) => {
      console.error('Prisma Studio process error:', err);
      this.studioProcess = null;
    });

    this.studioProcess.on('exit', (code) => {
      console.log(`Prisma Studio exited with code ${code}`);
      this.studioProcess = null;
    });

    // Wait briefly for startup
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return { running: this.studioProcess?.exitCode === null, port: this.studioPort };
  }

  async stopStudio(): Promise<{ running: boolean }> {
    if (!this.studioProcess || this.studioProcess.exitCode !== null) {
      this.studioProcess = null;
      return { running: false };
    }

    this.studioProcess.kill('SIGTERM');

    // Wait for process to exit
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        if (this.studioProcess) {
          this.studioProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      if (this.studioProcess) {
        this.studioProcess.on('exit', () => {
          clearTimeout(timeout);
          resolve();
        });
      } else {
        clearTimeout(timeout);
        resolve();
      }
    });

    this.studioProcess = null;
    return { running: false };
  }
}

export const adminService = new AdminService();
