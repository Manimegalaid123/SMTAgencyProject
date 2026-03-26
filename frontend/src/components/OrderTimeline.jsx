import React from 'react';
import './OrderTimeline.css';



// Amazon-style: checkmark for completed, empty circle for upcoming
function TimelineIcon({ completed }) {
  return completed ? (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" fill="#13a3b5" stroke="#13a3b5" strokeWidth="2"/>
      <path d="M9 15l3.5 3.5L19 12" stroke="#fff" strokeWidth="2.2" fill="none"/>
    </svg>
  ) : (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="13" fill="#fff" stroke="#13a3b5" strokeWidth="2"/>
    </svg>
  );
}

const deliverySteps = [
  { status: 'pending', label: 'Order Placed' },
  { status: 'approved', label: 'Order Confirmed' },
  { status: 'out_for_delivery', label: 'Out for Delivery' },
  { status: 'delivered', label: 'Delivered' },
];

const pickupSteps = [
  { status: 'pending', label: 'Order Placed' },
  { status: 'approved', label: 'Order Confirmed' },
  { status: 'ready_for_pickup', label: 'Ready for Pickup' },
  { status: 'collected', label: 'Collected' },
];

export default function OrderTimeline({ statusHistory = [], deliveryType = 'home_delivery' }) {
  const steps = deliveryType === 'store_pickup' ? pickupSteps : deliverySteps;
  // Map statusHistory to a lookup for quick access
  const historyMap = Object.fromEntries(
    statusHistory.map((s) => [s.status, s])
  );

  let lastCompletedIdx = -1;
  steps.forEach((step, idx) => {
    if (historyMap[step.status]) lastCompletedIdx = idx;
  });

  return (
    <div className="order-timeline">
      {steps.map((step, idx) => {
        const completed = !!historyMap[step.status];
        const isLast = idx === steps.length - 1;
        const date = historyMap[step.status]?.date
          ? new Date(historyMap[step.status].date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
          : '';
        return (
          <div className={`timeline-step${completed ? ' completed' : ''}`} key={step.status}>
            <div className="timeline-icon">
              <TimelineIcon completed={completed} />
            </div>
            <div className="timeline-label">{step.label}</div>
            <div className="timeline-date">{date}</div>
            {!isLast && <div className={`timeline-bar${idx < lastCompletedIdx ? ' filled' : ''}`}></div>}
          </div>
        );
      })}
    </div>
  );
}
