#!/bin/bash

# TheARKanban (MNDK) Smart Deployment Script
# 서버 맥북(혹은 프로덕션 서버) 전용 자동 배포 스크립트입니다.

echo "--- 🚀 Deploying TheARKanban (MNDK) ---"

# 1. 기기에 저장된 데이터(수동 변경된 마크다운 등) 보존을 위해 현재 상태 체크
if [[ -n $(git status -s) ]]; then
    echo "⚠️  서버에 로컬 변경사항이 감지되었습니다. 안전을 위해 임시 저장(git stash)을 시도합니다..."
    git stash
    STASHED=true
fi

# 2. 깃허브에서 최신 코드 가져오기 (로컬 맥북에서 작업한 내용들)
echo "Pulling latest changes from main branch..."
if git pull origin main; then
    echo "✅ Code updated successfully."
else
    echo "❌ git pull 실패! 수동으로 'git reset --hard' 혹은 충돌 해결이 필요합니다."
    exit 1
fi

# 3. 데이터 복구 (stash했던 경우)
if [ "$STASHED" = true ]; then
    echo "Restoring local data (git stash pop)..."
    git stash pop
fi

# 4. 필수 프로덕션 패키지 설치
# (구형 맥북의 esbuild 에러를 우회하기 위해 --omit=dev 와 --ignore-scripts 필수 포함)
echo "Installing production dependencies..."
npm install --omit=dev --ignore-scripts

# 5. PM2를 통한 칸반 봇 및 서버 재시작
echo "Restarting PM2 process (arkanban)..."
if pm2 restart arkanban; then
    echo "--- ✅ Deployment Complete! ---"
    pm2 status
else
    echo "❌ PM2 재시작 실패! 처음 실행하시는 거라면 'pm2 start dist/index.js --name arkanban' 이 필요할 수 있습니다."
    exit 1
fi
