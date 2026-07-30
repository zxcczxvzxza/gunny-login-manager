// No-op Windows signing hook.
//
// This is a personal app with no code-signing certificate, so we deliberately
// skip signtool entirely. Providing this hook stops electron-builder from
// downloading the `winCodeSign` binary, whose archive fails to extract on
// Windows without Developer Mode / admin (it contains macOS symlinks and
// 7-Zip cannot create them without the privilege).
async function sign() {
  // intentionally do nothing — the executable ships unsigned.
}

module.exports = sign;
module.exports.default = sign;
