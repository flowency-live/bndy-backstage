// useConfirm - Branded confirmation dialog hook
// Replaces native window.confirm() with styled AlertDialog

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmOptions {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
  const [state, setState] = useState<ConfirmState>({
    isOpen: false,
    description: '',
    resolve: null,
  });

  const confirm = ({
    title = 'Are you sure?',
    description,
    confirmText = 'OK',
    cancelText = 'Cancel',
    variant = 'default',
  }: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title,
        description,
        confirmText,
        cancelText,
        variant,
        resolve,
      });
    });
  };

  const handleConfirm = () => {
    state.resolve?.(true);
    setState({ ...state, isOpen: false, resolve: null });
  };

  const handleCancel = () => {
    state.resolve?.(false);
    setState({ ...state, isOpen: false, resolve: null });
  };

  const ConfirmDialog = () => (
    <AlertDialog open={state.isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.title}</AlertDialogTitle>
          <AlertDialogDescription>{state.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {state.cancelText || 'Cancel'}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className={
              state.variant === 'destructive'
                ? 'bg-red-600 hover:bg-red-700'
                : undefined
            }
          >
            {state.confirmText || 'OK'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { confirm, ConfirmDialog };
}
