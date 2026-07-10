#!/usr/bin/env bash
set -euo pipefail

devices=()
while IFS= read -r line; do
  devices+=("$line")
done < <(adb devices | tail -n +2 | awk '$2=="device" {print $1}')

if [ "${#devices[@]}" -lt 2 ]; then
  echo "Need at least 2 connected devices/emulators to run both apps (found ${#devices[@]})." >&2
  echo "Connected: ${devices[*]:-none}" >&2
  exit 1
fi

parent_device="${devices[0]}"
child_device="${devices[1]}"

echo "Parent app -> $parent_device"
echo "Child app  -> $child_device"

npx react-native run-android --mode=parentDebug --appId com.parentkey.parent --device "$parent_device" &
parent_pid=$!

npx react-native run-android --mode=childDebug --appId com.parentkey.child --device "$child_device" &
child_pid=$!

wait "$parent_pid" "$child_pid"
