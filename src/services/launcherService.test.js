import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));
vi.mock('node:fs', () => ({ existsSync: vi.fn() }));
vi.mock('electron', () => ({ shell: { openExternal: vi.fn() } }));
vi.mock('../config/settings.js', () => ({ getSettings: vi.fn() }));

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { shell } from 'electron';
import { getSettings } from '../config/settings.js';
import { runOfficialLauncher } from './launcherService.js';

const LAUNCHER = 'C:/Program Files (x86)/gunnyclient/GunnyClient.exe';

beforeEach(() => {
  vi.clearAllMocks();
  getSettings.mockReturnValue({ gunnyLauncherPath: LAUNCHER });
  spawn.mockReturnValue({ on: vi.fn(), unref: vi.fn() });
});

describe('runOfficialLauncher', () => {
  it('spawn launcher khi file tồn tại và trả success', () => {
    existsSync.mockReturnValue(true);

    const res = runOfficialLauncher();

    expect(res.success).toBe(true);
    expect(spawn).toHaveBeenCalledWith(LAUNCHER, [], expect.objectContaining({ detached: true }));
    expect(shell.openExternal).not.toHaveBeenCalled();
  });

  it('mở link tải và trả success:false khi không tìm thấy launcher', () => {
    existsSync.mockReturnValue(false);

    const res = runOfficialLauncher();

    expect(res.success).toBe(false);
    expect(spawn).not.toHaveBeenCalled();
    expect(shell.openExternal).toHaveBeenCalledTimes(1);
  });

  it('gọi unref để không giữ tiến trình con', () => {
    existsSync.mockReturnValue(true);
    const child = { on: vi.fn(), unref: vi.fn() };
    spawn.mockReturnValue(child);

    runOfficialLauncher();

    expect(child.unref).toHaveBeenCalled();
  });
});
