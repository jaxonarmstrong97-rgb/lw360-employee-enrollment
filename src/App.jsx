import React, { useState, useEffect, useRef } from 'react';

const SUPABASE_URL = 'https://aejnfgtttbenrnlmrsam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlam5mZ3R0dGJlbnJubG1yc2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2Mzk5NTMsImV4cCI6MjA5MDIxNTk1M30.8fLf1gmgdtF3J0JaLX_LC73Jk15N451zAfiM6NuDXdU';

// HARDCODED TEST MODE — ALL outbound emails go to jaxon only
const TEST_EMAIL_RECIPIENT = 'jaxon@livewellhsa.com';

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};
const headersGet = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
};

const COLORS = {
  navy: '#1A395C', lime: '#7AC143', sky: '#29ABE2', white: '#FFFFFF',
  gray: '#F5F7FA', darkGray: '#4A5568', lightGray: '#E2E8F0',
  red: '#E53E3E', green: '#38A169', yellow: '#D69E2E', orange: '#DD6B20'
};

const BENEFITS = [
  {
    name: '$0 Copay Telemedicine & Virtual Care',
    poweredBy: 'Powered by MD Live™',
    icon: '🩺',
    description: 'Care when you need it, 24/7. Access doctors and health professionals with no copay. Covers your entire household — urgent care, primary care, mental health providers, and dermatology.',
    color: COLORS.sky
  },
  {
    name: 'Employee Assistance Program',
    poweredBy: 'Powered by AllOne Health™',
    icon: '💚',
    description: 'Confidential support including medical advocacy, coaching, work-life referrals, financial consultations, legal referrals, and a 24/7 crisis management hotline.',
    color: COLORS.lime
  },
  {
    name: 'OVAL™ Modern Healthcare',
    poweredBy: null,
    icon: '💊',
    description: "Access to dermatology, hormone care, mental health treatments, men's & women's health, anti-aging & performance, and oral weight-care medications. Available in all 50 states.",
    color: COLORS.navy
  },
  {
    name: 'Prescription Discount Card',
    poweredBy: null,
    icon: '💳',
    description: 'Save on prescription medications at pharmacies nationwide.',
    color: '#6366f1'
  },
  {
    name: 'Vitals Facial Scanning',
    poweredBy: 'Powered by Anura™',
    icon: '📱',
    description: 'Take your vitals anytime using the Anura™ app — heart rate, breathing, BMI, stress level, and more in 30 seconds.',
    color: COLORS.orange
  }
];

const OPT_OUT_REASONS = [
  'Not interested in the program',
  "I don't understand the benefits",
  'I prefer my current setup',
  'Financial concerns',
  'Other'
];

const formatCurrency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

function getPremiumPerPeriod(payFrequency) {
  const map = { 'Weekly': 270.69, 'Biweekly': 541.38, 'Semi-Monthly': 586.50, 'Monthly': 1173 };
  return map[payFrequency] || 586.50;
}
function getFeePerPeriod(payFrequency, isSchool) {
  if (isSchool) {
    const periods = { 'Weekly': 52, 'Biweekly': 26, 'Semi-Monthly': 24, 'Monthly': 12 };
    return 80 * 12 / (periods[payFrequency] || 24);
  }
  const map = { 'Weekly': 20.68, 'Biweekly': 41.42, 'Semi-Monthly': 44.87, 'Monthly': 89.73 };
  return map[payFrequency] || 44.87;
}

export default function EmployeeEnrollment() {
  const [step, setStep] = useState('loading'); // loading, login, dashboard, optout, opted-out
  const [companyCode, setCompanyCode] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [optOutReason, setOptOutReason] = useState('');
  const [optOutReasonOther, setOptOutReasonOther] = useState('');
  const [daysRemaining, setDaysRemaining] = useState(14);
  const [campaign, setCampaign] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const pageStartTime = useRef(Date.now());
  const viewTracked = useRef(false);

  // Check URL for portal token, opt_out_id, or fall back to login form
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const optOutId = params.get('id');
    const page = window.location.pathname;

    if (token) {
      loadByToken(token);
    } else if (optOutId) {
      loadByOptOutId(optOutId, page.includes('/optout'));
    } else {
      setStep('login');
    }
  }, []);

  // Track page view time on unmount / navigation
  useEffect(() => {
    const startTime = Date.now();
    const handleUnload = () => {
      if (!employee?.id) return;
      const seconds = Math.round((Date.now() - startTime) / 1000);
      if (seconds < 5) return;
      fetch(`${SUPABASE_URL}/rest/v1/employees?id=eq.${employee.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ enrollment_page_time_seconds: seconds }),
        keepalive: true
      });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [employee]);

  const loadByToken = async (token) => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/employees?portal_token=eq.${encodeURIComponent(token)}&select=*`,
        { headers: headersGet }
      );
      const emps = await res.json();
      if (!emps || emps.length === 0) {
        setLoginError('Invalid or expired link. Please contact your HR department.');
        setStep('login');
        return;
      }
      const emp = emps[0];
      setEmployee(emp);

      const orgRes = await fetch(
        `${SUPABASE_URL}/rest/v1/organizations?id=eq.${emp.organization_id}&select=*`,
        { headers: headersGet }
      );
      const orgs = await orgRes.json();
      if (orgs?.length > 0) setOrganization(orgs[0]);

      const campRes = await fetch(
        `${SUPABASE_URL}/rest/v1/enrollment_campaigns?organization_id=eq.${emp.organization_id}&status=in.(In Progress,Sending,Completed)&order=created_at.desc&limit=1`,
        { headers: headersGet }
      );
      const camps = await campRes.json();
      if (camps?.length > 0) setCampaign(camps[0]);

      if (emp.enrollment_email_sent_at) {
        const sent = new Date(emp.enrollment_email_sent_at);
        const deadline = new Date(sent.getTime() + 14 * 24 * 60 * 60 * 1000);
        setDaysRemaining(Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))));
      }

      if (!viewTracked.current) {
        viewTracked.current = true;
        pageStartTime.current = Date.now();
        const viewCount = (emp.enrollment_page_view_count || 0) + 1;
        const updates = {
          enrollment_page_view_count: viewCount,
          enrollment_page_viewed_at: new Date().toISOString(),
        };
        if (emp.enrollment_status === 'Email Sent') {
          updates.enrollment_status = 'Viewed';
        }
        await fetch(`${SUPABASE_URL}/rest/v1/employees?id=eq.${emp.id}`, {
          method: 'PATCH', headers, body: JSON.stringify(updates)
        });
        setEmployee(prev => ({ ...prev, ...updates }));
      }

      if (emp.email_acknowledged_at || emp.enrollment_status === 'Enrolled') {
        setAcknowledged(true);
      }

      setStep(emp.enrollment_status === 'Opted Out' ? 'opted-out' : 'dashboard');
    } catch (err) {
      setLoginError('Something went wrong. Please try again.');
      setStep('login');
    }
  };

  const loadByOptOutId = async (optOutId, isOptOutPage) => {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/employees?opt_out_id=eq.${encodeURIComponent(optOutId)}&select=*`,
        { headers: headersGet }
      );
      const emps = await res.json();
      if (!emps || emps.length === 0) {
        setLoginError('Invalid enrollment link. Please contact your HR department.');
        setStep('login');
        return;
      }
      const emp = emps[0];
      setEmployee(emp);

      // Fetch org
      const orgRes = await fetch(
        `${SUPABASE_URL}/rest/v1/organizations?id=eq.${emp.organization_id}&select=*`,
        { headers: headersGet }
      );
      const orgs = await orgRes.json();
      if (orgs?.length > 0) setOrganization(orgs[0]);

      // Fetch campaign
      const campRes = await fetch(
        `${SUPABASE_URL}/rest/v1/enrollment_campaigns?organization_id=eq.${emp.organization_id}&status=in.(In Progress,Sending,Completed)&order=created_at.desc&limit=1`,
        { headers: headersGet }
      );
      const camps = await campRes.json();
      if (camps?.length > 0) setCampaign(camps[0]);

      // Calculate days remaining
      if (emp.enrollment_email_sent_at) {
        const sent = new Date(emp.enrollment_email_sent_at);
        const deadline = new Date(sent.getTime() + 14 * 24 * 60 * 60 * 1000);
        setDaysRemaining(Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))));
      }

      // Track page view
      if (!viewTracked.current) {
        viewTracked.current = true;
        pageStartTime.current = Date.now();
        const viewCount = (emp.enrollment_page_view_count || 0) + 1;
        const updates = {
          enrollment_page_view_count: viewCount,
          enrollment_page_viewed_at: new Date().toISOString(),
        };
        if (emp.enrollment_status === 'Email Sent') {
          updates.enrollment_status = 'Viewed';
        }
        await fetch(`${SUPABASE_URL}/rest/v1/employees?id=eq.${emp.id}`, {
          method: 'PATCH', headers, body: JSON.stringify(updates)
        });
        setEmployee(prev => ({ ...prev, ...updates }));
      }

      if (emp.email_acknowledged_at || emp.enrollment_status === 'Enrolled') {
        setAcknowledged(true);
      }

      if (emp.enrollment_status === 'Opted Out') {
        setStep('opted-out');
      } else if (isOptOutPage) {
        setStep('optout');
      } else {
        setStep('dashboard');
      }
    } catch (err) {
      setLoginError('Something went wrong. Please try again.');
      setStep('login');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
      const orgRes = await fetch(
        `${SUPABASE_URL}/rest/v1/organizations?code=eq.${encodeURIComponent(companyCode.toUpperCase())}&select=*`,
        { headers: headersGet }
      );
      const orgs = await orgRes.json();
      if (!orgs || orgs.length === 0) {
        setLoginError('Company code not found.');
        setLoading(false);
        return;
      }
      const org = orgs[0];
      setOrganization(org);

      const empRes = await fetch(
        `${SUPABASE_URL}/rest/v1/employees?organization_id=eq.${org.id}&or=(employee_id_external.eq.${encodeURIComponent(employeeId)},email.ilike.${encodeURIComponent(employeeId)})&select=*`,
        { headers: headersGet }
      );
      const emps = await empRes.json();
      if (!emps || emps.length === 0) {
        setLoginError('Employee not found. Please check your ID or email.');
        setLoading(false);
        return;
      }
      const emp = emps[0];
      setEmployee(emp);

      // Fetch campaign
      const campRes = await fetch(
        `${SUPABASE_URL}/rest/v1/enrollment_campaigns?organization_id=eq.${org.id}&status=in.(In Progress,Sending,Completed)&order=created_at.desc&limit=1`,
        { headers: headersGet }
      );
      const camps = await campRes.json();
      if (camps?.length > 0) setCampaign(camps[0]);

      if (emp.enrollment_email_sent_at) {
        const sent = new Date(emp.enrollment_email_sent_at);
        const deadline = new Date(sent.getTime() + 14 * 24 * 60 * 60 * 1000);
        setDaysRemaining(Math.max(0, Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24))));
      }

      // Track view
      if (!viewTracked.current) {
        viewTracked.current = true;
        pageStartTime.current = Date.now();
        const viewCount = (emp.enrollment_page_view_count || 0) + 1;
        const viewUpdates = {
          enrollment_page_view_count: viewCount,
          enrollment_page_viewed_at: new Date().toISOString(),
          enrollment_status: 'Viewed'
        };
        await fetch(`${SUPABASE_URL}/rest/v1/employees?id=eq.${emp.id}`, {
          method: 'PATCH', headers,
          body: JSON.stringify(viewUpdates)
        });
        setEmployee(prev => ({ ...prev, ...viewUpdates }));
      }

      if (emp.email_acknowledged_at || emp.enrollment_status === 'Enrolled') {
        setAcknowledged(true);
      }

      setStep(emp.enrollment_status === 'Opted Out' ? 'opted-out' : 'dashboard');
    } catch (err) {
      setLoginError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleOptOut = async () => {
    setLoading(true);
    try {
      const reason = optOutReason === 'Other' ? optOutReasonOther : optOutReason;

      // Update employee record
      await fetch(`${SUPABASE_URL}/rest/v1/employees?id=eq.${employee.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({
          enrollment_status: 'Opted Out',
          opted_out_at: new Date().toISOString(),
          opt_out_reason: reason || null,
          opt_out_user_agent: navigator.userAgent,
        })
      });

      // Log to audit_log
      await fetch(`${SUPABASE_URL}/rest/v1/audit_log`, {
        method: 'POST', headers,
        body: JSON.stringify({
          action: 'Employee Opted Out',
          action_category: 'enrollment',
          organization_id: employee.organization_id,
          employee_id: employee.id,
          details: { reason, opt_out_id: employee.opt_out_id, is_test: employee.is_test }
        })
      });

      // Create notification for Jaxon
      await fetch(`${SUPABASE_URL}/rest/v1/notifications`, {
        method: 'POST', headers,
        body: JSON.stringify({
          recipient_type: 'internal',
          recipient_id: '8fba22c5-1d5b-4549-8465-1f3627d616ea',
          title: `${employee.first_name} ${employee.last_name} opted out`,
          message: `${employee.first_name} ${employee.last_name} from ${organization?.name || 'Unknown Org'} has opted out. Reason: ${reason || 'No reason given'}`,
          organization_id: employee.organization_id,
          notification_type: 'opt_out'
        })
      });

      // Send opt-out confirmation email (TEST MODE — goes to jaxon)
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-enrollment-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: TEST_EMAIL_RECIPIENT, // HARDCODED TEST
            to_name: employee.first_name,
            subject: `[TEST] Opt-Out Confirmation - ${employee.first_name} ${employee.last_name}`,
            template: 'opt-out-confirmation',
            data: {
              employee_name: employee.first_name,
              company_name: organization?.name || '',
              opt_out_id: employee.opt_out_id,
              original_recipient: `${employee.first_name} ${employee.last_name} (${employee.email})`
            }
          })
        });
      } catch (emailErr) {
        // email failure is non-critical, continue
      }

      // Update campaign opted_out count
      if (campaign?.id) {
        await fetch(`${SUPABASE_URL}/rest/v1/rpc/increment_campaign_opted_out`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ p_campaign_id: campaign.id })
        });
      }

      setEmployee(prev => ({ ...prev, enrollment_status: 'Opted Out', opted_out_at: new Date().toISOString() }));
      setStep('opted-out');
    } catch (err) {
      alert('Failed to process opt-out. Please try again.');
    }
    setLoading(false);
  };

  const handleAcknowledge = async () => {
    setLoading(true);
    try {
      const updates = { email_acknowledged_at: new Date().toISOString() };
      if (['Viewed', 'Email Sent', 'Pending'].includes(employee.enrollment_status)) {
        updates.enrollment_status = 'Enrolled';
      }
      await fetch(`${SUPABASE_URL}/rest/v1/employees?id=eq.${employee.id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify(updates)
      });
      await fetch(`${SUPABASE_URL}/rest/v1/email_events`, {
        method: 'POST', headers,
        body: JSON.stringify({
          employee_id: employee.id,
          organization_id: employee.organization_id,
          campaign_id: campaign?.id || null,
          event_type: 'acknowledged'
        })
      });
      setEmployee(prev => ({ ...prev, ...updates }));
      setAcknowledged(true);
    } catch (err) {
      alert('Failed to save. Please try again.');
    }
    setLoading(false);
  };

  const resetToLogin = () => {
    setStep('login');
    setEmployee(null);
    setOrganization(null);
    setCompanyCode('');
    setEmployeeId('');
    viewTracked.current = false;
    // Clear URL params
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Loading state
  if (step === 'loading') {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.gray, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: COLORS.darkGray }}>
          <div style={{ width: 40, height: 40, border: `4px solid ${COLORS.lightGray}`, borderTopColor: COLORS.sky, borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p>Loading your benefits...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    );
  }

  // Login Screen
  if (step === 'login') {
    return (
      <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${COLORS.navy} 0%, #2d5a8a 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: COLORS.white, borderRadius: 20, padding: 40, maxWidth: 420, width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
              <span style={{ color: COLORS.lime }}>LIVE</span>
              <span style={{ color: COLORS.sky }}>WELL</span>
              <span style={{ color: COLORS.lime }}>360</span>
            </div>
            <h1 style={{ color: COLORS.navy, fontSize: 22, margin: '0 0 8px', fontWeight: 600 }}>Your Benefits Portal</h1>
            <p style={{ color: COLORS.darkGray, fontSize: 14, margin: 0 }}>View your personalized wellness benefits</p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: COLORS.navy, marginBottom: 8 }}>Company Code</label>
              <input type="text" value={companyCode} onChange={e => setCompanyCode(e.target.value.toUpperCase())}
                placeholder="e.g., ACME2024"
                style={{ width: '100%', padding: '14px 16px', fontSize: 16, border: `2px solid ${COLORS.lightGray}`, borderRadius: 10, outline: 'none', textTransform: 'uppercase', letterSpacing: 1, boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: COLORS.navy, marginBottom: 8 }}>Employee ID or Email</label>
              <input type="text" value={employeeId} onChange={e => setEmployeeId(e.target.value)}
                placeholder="Your employee ID or email"
                style={{ width: '100%', padding: '14px 16px', fontSize: 16, border: `2px solid ${COLORS.lightGray}`, borderRadius: 10, outline: 'none', boxSizing: 'border-box' }} />
            </div>

            {loginError && (
              <div style={{ padding: '12px 16px', background: `${COLORS.red}15`, border: `1px solid ${COLORS.red}30`, borderRadius: 8, marginBottom: 20 }}>
                <p style={{ margin: 0, fontSize: 14, color: COLORS.red }}>{loginError}</p>
              </div>
            )}

            <button type="submit" disabled={loading || !companyCode || !employeeId}
              style={{ width: '100%', padding: 16, fontSize: 16, fontWeight: 600, background: loading ? COLORS.lightGray : `linear-gradient(135deg, ${COLORS.lime}, #5fa832)`, color: COLORS.white, border: 'none', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 14px rgba(122,193,67,0.3)' }}>
              {loading ? 'Signing in...' : 'View My Benefits'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: COLORS.darkGray }}>
            Need help? Call <a href="tel:8067991099" style={{ color: COLORS.sky }}>(806) 799-1099</a>
          </p>
        </div>
      </div>
    );
  }

  // Opted Out Confirmation
  if (step === 'opted-out') {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.gray, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, paddingTop: employee?.is_test ? '40px' : 20 }}>
        {employee?.is_test && <TestBanner />}
        <div style={{ background: COLORS.white, borderRadius: 20, padding: 48, maxWidth: 500, width: '100%', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${COLORS.darkGray}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 36 }}>✓</div>
          <h1 style={{ color: COLORS.navy, fontSize: 24, margin: '0 0 16px' }}>You've Opted Out</h1>
          <p style={{ color: COLORS.darkGray, fontSize: 16, lineHeight: 1.6, margin: '0 0 16px' }}>
            You will not be enrolled in the Live Well 360 wellness benefit program.
            If you change your mind, please contact your HR department.
          </p>
          {employee?.opt_out_id && (
            <p style={{ color: COLORS.darkGray, fontSize: 13, margin: '0 0 32px' }}>
              Reference: <strong>{employee.opt_out_id}</strong>
            </p>
          )}
          <button onClick={resetToLogin}
            style={{ padding: '14px 32px', fontSize: 15, fontWeight: 500, background: 'transparent', color: COLORS.navy, border: `2px solid ${COLORS.navy}`, borderRadius: 10, cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Opt-Out Confirmation Screen
  if (step === 'optout') {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.gray, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, paddingTop: employee?.is_test ? '40px' : 20 }}>
        {employee?.is_test && <TestBanner />}
        <div style={{ background: COLORS.white, borderRadius: 20, padding: 40, maxWidth: 500, width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${COLORS.red}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 28 }}>⚠️</div>
            <h2 style={{ color: COLORS.navy, fontSize: 22, margin: '0 0 8px' }}>Are You Sure?</h2>
            <p style={{ color: COLORS.darkGray, fontSize: 14, margin: 0 }}>You're about to opt out of the wellness benefit program</p>
          </div>

          <div style={{ background: `${COLORS.red}10`, border: `1px solid ${COLORS.red}30`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
            <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 600, color: COLORS.red }}>By opting out, you will lose:</p>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: COLORS.darkGray, lineHeight: 1.8 }}>
              <li><strong>{formatCurrency(employee?.net_benefit_monthly || 0)}/month</strong> in additional take-home pay</li>
              <li>Free 24/7 telemedicine & virtual care for your household</li>
              <li>Employee Assistance Program (advocacy, coaching, crisis hotline)</li>
              <li>OVAL Modern Healthcare, prescription discounts & more</li>
            </ul>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 14, fontWeight: 500, color: COLORS.navy, marginBottom: 8 }}>Reason for opting out</label>
            <select value={optOutReason} onChange={e => setOptOutReason(e.target.value)}
              style={{ width: '100%', padding: '12px 16px', fontSize: 14, border: `1px solid ${COLORS.lightGray}`, borderRadius: 8, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}>
              <option value="">Select a reason (optional)</option>
              {OPT_OUT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            {optOutReason === 'Other' && (
              <textarea value={optOutReasonOther} onChange={e => setOptOutReasonOther(e.target.value)}
                placeholder="Please explain..." rows={3}
                style={{ width: '100%', padding: '12px 16px', fontSize: 14, border: `1px solid ${COLORS.lightGray}`, borderRadius: 8, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setStep('dashboard')}
              style={{ flex: 1, padding: 14, fontSize: 15, fontWeight: 500, background: COLORS.lime, color: COLORS.white, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
              Keep My Benefits
            </button>
            <button onClick={handleOptOut} disabled={loading}
              style={{ flex: 1, padding: 14, fontSize: 15, fontWeight: 500, background: 'transparent', color: COLORS.red, border: `2px solid ${COLORS.red}`, borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer' }}>
              {loading ? 'Processing...' : 'Confirm Opt-Out'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Dashboard ────────────────────────────────────────────────────────
  const payFreq = employee?.pay_frequency || organization?.pay_frequency || 'Semi-Monthly';
  const periodsPerYear = { 'Weekly': 52, 'Biweekly': 26, 'Semi-Monthly': 24, 'Monthly': 12 }[payFreq] || 24;
  const premiumPP = getPremiumPerPeriod(payFreq);
  const feePP = getFeePerPeriod(payFreq, organization?.is_school_district);
  const reimbPP = premiumPP;

  // Current paycheck values
  const grossPP = employee?.annual_salary ? Number(employee.annual_salary) / periodsPerYear : (employee?.gross_pay_per_period || 0);
  const currentFITPP = employee?.current_fit_per_period || (employee?.fit_before_annual ? employee.fit_before_annual / periodsPerYear : 0);
  const currentSSPP = employee?.current_ss_per_period || 0;
  const currentMedPP = employee?.current_medicare_per_period || 0;
  const currentPretaxPP = (Number(employee?.current_401k_per_period) || 0) + (Number(employee?.current_health_insurance_per_period) || 0) + (Number(employee?.current_hsa_per_period) || 0) + (Number(employee?.current_other_pretax_per_period) || 0);

  // New paycheck values
  const newFITPP = employee?.new_fit_per_period || (employee?.fit_after_annual ? employee.fit_after_annual / periodsPerYear : 0);
  const newSSPP = employee?.new_ss_per_period || currentSSPP;
  const newMedPP = employee?.new_medicare_per_period || currentMedPP;

  const fitSavingsMonthly = employee?.fit_savings_per_period ? employee.fit_savings_per_period * periodsPerYear / 12 : (employee?.fit_savings_monthly || 0);
  const ssSavingsMonthly = employee?.ss_savings_per_period ? employee.ss_savings_per_period * periodsPerYear / 12 : (employee?.ss_savings_monthly || 0);
  const medSavingsMonthly = employee?.medicare_savings_per_period ? employee.medicare_savings_per_period * periodsPerYear / 12 : (employee?.medicare_savings_monthly || 0);
  const ficaSavingsMonthly = ssSavingsMonthly + medSavingsMonthly;
  const feeMonthly = organization?.is_school_district ? 80 : 89.73;
  const netBenefitMonthly = employee?.net_benefit_monthly || (fitSavingsMonthly + ficaSavingsMonthly - feeMonthly);

  const campaignEndDate = campaign?.end_date ? new Date(campaign.end_date) : null;
  const deadlineStr = campaignEndDate ? campaignEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.gray, paddingTop: employee?.is_test ? '40px' : 0 }}>
      {/* TEST DATA Banner */}
      {employee?.is_test && <TestBanner />}

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${COLORS.navy} 0%, #2d5a8a 100%)`, padding: '24px 20px 80px', textAlign: 'center' }}>
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          <span style={{ color: COLORS.lime }}>LIVE</span>
          <span style={{ color: COLORS.sky }}>WELL</span>
          <span style={{ color: COLORS.lime }}>360</span>
        </div>
        <h1 style={{ color: COLORS.white, fontSize: 26, margin: '0 0 8px', fontWeight: 600 }}>
          Welcome, {employee?.first_name}!
        </h1>
        <p style={{ color: COLORS.sky, fontSize: 15, margin: 0, opacity: 0.9 }}>{organization?.name}</p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: '-60px auto 0', padding: '0 20px 40px' }}>

        {/* Paycheck Comparison Card */}
        <div style={{ background: COLORS.white, borderRadius: 20, padding: 28, marginBottom: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div>
              <h2 style={{ color: COLORS.navy, fontSize: 18, margin: '0 0 4px', fontWeight: 600 }}>Your Paycheck Comparison</h2>
              <p style={{ color: COLORS.darkGray, fontSize: 13, margin: 0 }}>See how your paycheck changes with Live Well 360</p>
            </div>
            <span style={{ background: `${COLORS.lime}15`, padding: '6px 12px', borderRadius: 20, color: COLORS.lime, fontSize: 13, fontWeight: 600 }}>
              {employee?.enrollment_status || 'Pending'}
            </span>
          </div>

          {/* Net Benefit Hero */}
          <div style={{ background: `linear-gradient(135deg, ${COLORS.lime} 0%, #5fa832 100%)`, borderRadius: 16, padding: 24, textAlign: 'center', marginBottom: 24 }}>
            <p style={{ color: COLORS.white, fontSize: 14, margin: '0 0 4px', opacity: 0.9 }}>YOUR MONTHLY GAIN</p>
            <p style={{ color: COLORS.white, fontSize: 42, fontWeight: 700, margin: '0 0 4px' }}>{formatCurrency(netBenefitMonthly)}</p>
            <p style={{ color: COLORS.white, fontSize: 14, margin: 0, opacity: 0.9 }}>per month in additional take-home pay</p>
          </div>

          {/* Paycheck Comparison Table */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, fontSize: 13 }}>
              {/* Header */}
              <div style={{ padding: '10px 12px', fontWeight: 700, color: COLORS.navy, borderBottom: `2px solid ${COLORS.lightGray}` }}></div>
              <div style={{ padding: '10px 12px', fontWeight: 700, color: COLORS.navy, borderBottom: `2px solid ${COLORS.lightGray}`, textAlign: 'right' }}>Current</div>
              <div style={{ padding: '10px 12px', fontWeight: 700, color: COLORS.lime, borderBottom: `2px solid ${COLORS.lightGray}`, textAlign: 'right' }}>With LW360</div>

              {/* Gross Pay */}
              <CompRow label="Gross Pay" current={grossPP} newVal={grossPP} />

              {/* Pre-tax deductions */}
              <CompRow label="Existing Pre-Tax" current={-currentPretaxPP} newVal={-currentPretaxPP} isDeduction />
              <CompRow label="LW Premium (pre-tax)" current={0} newVal={-premiumPP} isDeduction isNew />

              {/* Taxes */}
              <CompRow label="Federal Income Tax" current={-currentFITPP} newVal={-newFITPP} isDeduction isSavings />
              <CompRow label="Social Security" current={-currentSSPP} newVal={-newSSPP} isDeduction isSavings />
              <CompRow label="Medicare" current={-currentMedPP} newVal={-newMedPP} isDeduction isSavings />

              {/* Post-tax */}
              <CompRow label="LW Employee Fee" current={0} newVal={-feePP} isDeduction isNew />
              <CompRow label="LW Reimbursement" current={0} newVal={reimbPP} isNew isPositive />

              {/* Net */}
              <div style={{ padding: '12px 12px', fontWeight: 700, color: COLORS.navy, borderTop: `2px solid ${COLORS.navy}`, fontSize: 14 }}>Net Pay</div>
              <div style={{ padding: '12px 12px', fontWeight: 700, color: COLORS.navy, borderTop: `2px solid ${COLORS.navy}`, textAlign: 'right', fontSize: 14 }}>
                {formatCurrency(grossPP - currentPretaxPP - currentFITPP - currentSSPP - currentMedPP)}
              </div>
              <div style={{ padding: '12px 12px', fontWeight: 700, color: COLORS.lime, borderTop: `2px solid ${COLORS.navy}`, textAlign: 'right', fontSize: 14 }}>
                {formatCurrency(grossPP - currentPretaxPP - premiumPP - newFITPP - newSSPP - newMedPP - feePP + reimbPP)}
              </div>
            </div>
          </div>

          {/* Savings Breakdown */}
          <div style={{ background: COLORS.gray, borderRadius: 12, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: COLORS.navy, margin: '0 0 12px' }}>Monthly Savings Breakdown:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SavingsRow label="FIT Savings" amount={fitSavingsMonthly} color={COLORS.green} />
              {ssSavingsMonthly > 0 && <SavingsRow label="Social Security Savings" amount={ssSavingsMonthly} color={COLORS.green} />}
              <SavingsRow label="Medicare Savings" amount={medSavingsMonthly} color={COLORS.green} />
              <SavingsRow label={`Employee Fee (${formatCurrency(employee?.lw_fee_per_period || feePP)}/check)`} amount={-feeMonthly} color={COLORS.red} />
              <div style={{ borderTop: `1px solid ${COLORS.lightGray}`, paddingTop: 8, marginTop: 4, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600 }}>
                <span style={{ color: COLORS.navy }}>Net Monthly Benefit</span>
                <span style={{ color: COLORS.lime }}>{formatCurrency(netBenefitMonthly)}</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: 12, color: COLORS.darkGray, margin: '16px 0 0', lineHeight: 1.5 }}>
            A ${formatCurrency(1173)}/month wellness premium is deducted pre-tax from your paycheck, then 100% reimbursed post-tax.
            Your net gain comes from the tax savings on that pre-tax deduction, minus a small employee fee.
          </p>
        </div>

        {/* Wellness Benefits */}
        <div style={{ background: COLORS.white, borderRadius: 20, padding: 28, marginBottom: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: COLORS.navy, fontSize: 18, margin: '0 0 20px', fontWeight: 600 }}>Your Wellness Benefits</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {BENEFITS.map((b, i) => (
              <div key={i} style={{ background: COLORS.gray, borderRadius: 12, padding: 20, borderLeft: `4px solid ${b.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: b.description ? 10 : 0 }}>
                  <span style={{ fontSize: 28 }}>{b.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: COLORS.navy }}>{b.name}</h3>
                    {b.poweredBy && <p style={{ margin: '2px 0 0', fontSize: 12, color: COLORS.sky, fontStyle: 'italic' }}>{b.poweredBy}</p>}
                  </div>
                </div>
                {b.description && <p style={{ margin: 0, fontSize: 13, color: COLORS.darkGray, lineHeight: 1.7 }}>{b.description}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Acknowledgment Button */}
        {employee?.enrollment_status !== 'Opted Out' && (
          <div style={{ background: COLORS.white, borderRadius: 20, padding: 28, marginBottom: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            {acknowledged ? (
              <>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
                <p style={{ color: COLORS.lime, fontWeight: 700, fontSize: 17, margin: '0 0 8px' }}>Enrolled</p>
                <p style={{ color: COLORS.darkGray, fontSize: 14, margin: 0, lineHeight: 1.6 }}>
                  Thank you! Your enrollment is confirmed. You'll receive login credentials for your wellness products before your effective date.
                </p>
              </>
            ) : (
              <>
                <button
                  onClick={handleAcknowledge}
                  disabled={loading}
                  style={{ width: '100%', padding: '18px 24px', fontSize: 17, fontWeight: 700, background: `linear-gradient(135deg, ${COLORS.lime}, #5fa832)`, color: COLORS.white, border: 'none', borderRadius: 12, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 16px rgba(122,193,67,0.35)', marginBottom: 12 }}>
                  {loading ? 'Saving...' : "I've Reviewed My Benefits"}
                </button>
                <p style={{ color: COLORS.darkGray, fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                  Clicking confirms you've reviewed your benefits. You'll be enrolled automatically if you don't opt out.
                </p>
              </>
            )}
          </div>
        )}

        {/* Enrollment Status */}
        <div style={{ background: COLORS.white, borderRadius: 20, padding: 28, marginBottom: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: COLORS.navy, fontSize: 18, margin: '0 0 12px', fontWeight: 600 }}>Enrollment Status</h2>
          {employee?.enrollment_status === 'Enrolled' ? (
            <div style={{ background: `${COLORS.lime}10`, border: `1px solid ${COLORS.lime}30`, borderRadius: 12, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 15, color: COLORS.lime, fontWeight: 600 }}>You are enrolled in Live Well 360!</p>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: COLORS.darkGray }}>Your benefits are active. If you have questions, contact your HR department.</p>
            </div>
          ) : (
            <>
              <p style={{ color: COLORS.darkGray, fontSize: 14, margin: '0 0 8px', lineHeight: 1.5 }}>
                You are currently set to be enrolled. If you do nothing, you will be automatically enrolled when the opt-out window closes.
              </p>
              {deadlineStr && (
                <div style={{ background: `${COLORS.sky}10`, border: `1px solid ${COLORS.sky}30`, borderRadius: 12, padding: 16, marginTop: 12 }}>
                  <p style={{ margin: 0, fontSize: 14, color: COLORS.navy }}>
                    <strong>Enrollment deadline:</strong> {deadlineStr}
                    {daysRemaining > 0 && <span style={{ color: COLORS.orange, fontWeight: 600, marginLeft: 8 }}>({daysRemaining} days remaining)</span>}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Opt-Out Section */}
        {daysRemaining > 0 && !acknowledged && employee?.enrollment_status !== 'Enrolled' && employee?.enrollment_status !== 'Opted Out' && (
          <div style={{ background: COLORS.white, borderRadius: 20, padding: '20px 28px', marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', borderTop: `3px solid ${COLORS.lightGray}` }}>
            <p style={{ color: COLORS.darkGray, fontSize: 13, margin: '0 0 12px', lineHeight: 1.6 }}>
              If you prefer not to participate, you must opt out by{' '}
              <strong style={{ color: COLORS.red }}>
                {deadlineStr || `${daysRemaining} days from today`}
              </strong>.
            </p>
            <button onClick={() => setStep('optout')}
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: 500, background: 'transparent', color: COLORS.darkGray, border: `1px solid ${COLORS.lightGray}`, borderRadius: 8, cursor: 'pointer' }}>
              Opt Out
            </button>
          </div>
        )}

        {/* Contact */}
        <div style={{ background: COLORS.white, borderRadius: 20, padding: 28, marginBottom: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          <h2 style={{ color: COLORS.navy, fontSize: 18, margin: '0 0 12px', fontWeight: 600 }}>Questions?</h2>
          <p style={{ color: COLORS.darkGray, fontSize: 14, margin: '0 0 16px' }}>We're here to help you understand your benefits</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="tel:8067991099" style={{ padding: '12px 24px', fontSize: 14, fontWeight: 500, background: COLORS.navy, color: COLORS.white, borderRadius: 8, textDecoration: 'none' }}>
              (806) 799-1099
            </a>
            <a href="mailto:info@livewellhsa.com" style={{ padding: '12px 24px', fontSize: 14, fontWeight: 500, background: 'transparent', color: COLORS.navy, border: `2px solid ${COLORS.navy}`, borderRadius: 8, textDecoration: 'none' }}>
              Email Us
            </a>
          </div>
        </div>

        {/* Sign Out */}
        <div style={{ textAlign: 'center' }}>
          <button onClick={resetToLogin}
            style={{ padding: '12px 24px', fontSize: 14, background: 'transparent', color: COLORS.darkGray, border: 'none', cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: COLORS.navy, padding: 20, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 12, color: COLORS.sky, opacity: 0.8 }}>
          &copy; {new Date().getFullYear()} Live Well 360 Health Strategy Advisors | livewellhealth360.com
        </p>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TestBanner() {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#fbbf24', color: '#92400e', textAlign: 'center',
      padding: '8px 16px', fontSize: 13, fontWeight: 600
    }}>
      TEST ENVIRONMENT — This is not a real enrollment
    </div>
  );
}

function CompRow({ label, current, newVal, isDeduction, isNew, isSavings, isPositive }) {
  const COLORS = { navy: '#1A395C', darkGray: '#4A5568', lime: '#7AC143', lightGray: '#E2E8F0', green: '#38A169', red: '#E53E3E' };
  const formatVal = (v) => {
    if (v === 0 && !isNew) return '—';
    if (v === 0) return '$0.00';
    const abs = Math.abs(v);
    const formatted = `$${abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return v < 0 ? `-${formatted}` : (isPositive ? `+${formatted}` : formatted);
  };

  const newColor = isSavings && newVal > current ? COLORS.lime :
    isPositive ? COLORS.lime :
    isNew && newVal < 0 ? COLORS.darkGray : COLORS.darkGray;

  return (
    <>
      <div style={{ padding: '6px 12px', color: COLORS.darkGray, fontSize: 13, borderBottom: `1px solid ${COLORS.lightGray}` }}>{label}</div>
      <div style={{ padding: '6px 12px', color: COLORS.darkGray, fontSize: 13, textAlign: 'right', borderBottom: `1px solid ${COLORS.lightGray}` }}>{formatVal(current)}</div>
      <div style={{ padding: '6px 12px', color: newColor, fontSize: 13, textAlign: 'right', borderBottom: `1px solid ${COLORS.lightGray}`, fontWeight: isSavings || isPositive ? 600 : 400 }}>{formatVal(newVal)}</div>
    </>
  );
}

function SavingsRow({ label, amount, color }) {
  const prefix = amount >= 0 ? '+' : '';
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
      <span style={{ color: '#4A5568' }}>{label}</span>
      <span style={{ color, fontWeight: 500 }}>{prefix}{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}</span>
    </div>
  );
}
