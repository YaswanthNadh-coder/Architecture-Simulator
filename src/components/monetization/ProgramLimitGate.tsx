import { useState, useCallback, type ReactNode } from 'react';
import { useSubscriptionStore } from '../../store/subscriptionStore';
import { UpgradeModal } from './UpgradeModal';

interface ProgramLimitGateProps {
  /** Current number of programs the user has */
  currentCount: number;
  /** Called when the action is allowed */
  onAllow: () => void;
  /** Render prop — passes the gated action handler */
  children: (handleAction: () => void) => ReactNode;
}

/**
 * ProgramLimitGate — Intercepts program creation and checks against
 * the user's tier limit. Shows an upgrade modal when limit is reached.
 */
export const ProgramLimitGate = ({ currentCount, onAllow, children }: ProgramLimitGateProps) => {
  const { isWithinProgramLimit } = useSubscriptionStore();
  const [showModal, setShowModal] = useState(false);

  const handleAction = useCallback(() => {
    if (isWithinProgramLimit(currentCount)) {
      onAllow();
    } else {
      setShowModal(true);
    }
  }, [currentCount, isWithinProgramLimit, onAllow]);

  return (
    <>
      {children(handleAction)}
      {showModal && (
        <UpgradeModal
          feature="maxPrograms"
          context={`You've reached the Free plan's limit of ${useSubscriptionStore.getState().capabilities.maxPrograms} saved programs.`}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};
