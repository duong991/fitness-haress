'use client';

import { RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Card';

/** Shown instead of an endless skeleton when the JSON store cannot be read. */
export default function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon={<RefreshCw />}
      title="Không tải được dữ liệu"
      description="Không đọc được file trong data/. Kiểm tra server đang chạy và JSON hợp lệ (pnpm validate), rồi thử lại."
      action={
        <Button variant="secondary" onClick={onRetry}>
          Thử lại
        </Button>
      }
    />
  );
}
