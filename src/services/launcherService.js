import { spawn } from 'node:child_process';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { shell } from 'electron';
import { getSettings } from '../config/settings.js';

const DOWNLOAD_URL = 'https://drive.google.com/drive/folders/1lhFDUdq1_TKkh1P8WmLH0XFULCOm-Ryc';

/**
 * Mở launcher gốc GunnyClient.exe để nó tự kiểm tra phiên bản và cập nhật tài
 * nguyên game. Launcher gốc tự xin quyền admin khi cần ghi vào Program Files,
 * nên app chỉ uỷ quyền — không tự tải, không cần chạy quyền admin.
 *
 * @returns {{ success: boolean, msg: string }}
 */
export function runOfficialLauncher() {
  const filePath = getSettings().gunnyLauncherPath;

  if (!filePath || !existsSync(filePath)) {
    shell.openExternal(DOWNLOAD_URL);
    return { success: false, msg: 'Không tìm thấy GunnyClient.exe. Đang mở link tải...' };
  }

  try {
    const child = spawn(filePath, [], {
      cwd: path.dirname(filePath),
      detached: true,
      stdio: 'ignore',
    });
    child.on('error', (err) => console.error('[Launcher] Spawn error:', err.message));
    child.unref();
    return { success: true, msg: 'Đã mở launcher gốc để cập nhật game.' };
  } catch (err) {
    return { success: false, msg: 'Lỗi mở launcher: ' + err.message };
  }
}
