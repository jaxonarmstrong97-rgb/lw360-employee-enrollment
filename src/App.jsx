import React, { useState, useEffect } from 'react';

const SUPABASE_URL = 'https://aejnfgtttbenrnlmrsam.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlam5mZ3R0dGJlbnJubG1yc2FtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2Mzk5NTMsImV4cCI6MjA5MDIxNTk1M30.8fLf1gmgdtF3J0JaLX_LC73Jk15N451zAfiM6NuDXdU';

const COLORS = {
  navy: '#1A395C',
  lime: '#7AC143',
  sky: '#29ABE2',
  white: '#FFFFFF',
  gray: '#F5F7FA',
  darkGray: '#4A5568',
  lightGray: '#E2E8F0',
  red: '#E53E3E',
  green: '#38A169'
};

const BENEFITS = [
  {
    name: 'MDLive Telehealth',
    icon: '\u{1FA7A}',
    description: '24/7 access to board-certified doctors via phone or video',
    features: ['$0 copay for all visits', 'Available nationwide', 'Prescriptions sent to your pharmacy', 'Mental health counseling available'],
    color: COLORS.sky
  },
  {
    name: 'AllOne Health EAP',
    icon: '\u{1F49A}',
    description: 'Confidential counseling and life coaching services',
    features: ['8 free counseling sessions per year', 'Work-life balance support', 'Legal & financial consultations', '24/7 crisis support'],
    color: COLORS.lime
  },
  {
    name: 'OVAL Rx Discounts',
    icon: '\u{1F48A}',
    description: 'Prescription discount program for you and your family',
    features: ['Save up to 80% on prescriptions', 'Accepted at 60,000+ pharmacies', 'No enrollment required', 'Covers family members'],
    color: COLORS.navy
  }
];

export default function EmployeeEnrollment() {
  const [step, setStep] = useState('login');
  const [companyCode, setCompanyCode] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [optOutReason, setOptOutReason] = useState('');
  const [daysRemaining, setDaysRemaining] = useState(14);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    try {
      const orgRes = await fetch(
        `${SUPABASE_URL}/rest/v1/organizations?code=eq.${companyCode.toUpperCase()}&select=*`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      const orgs = await orgRes.json();

      if (!orgs || orgs.length === 0) {
        setLoginError('Company code not found. Please check and try again.');
        setLoading(false);
        return;
      }

      const org = orgs[0];
      setOrganization(org);

      const empRes = await fetch(
        `${SUPABASE_URL}/rest/v1/employees?organization_id=eq.${org.id}&or=(employee_id.eq.${employeeId},email.ilike.${employeeId})&select=*`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        }
      );
      const emps = await empRes.json();

      if (!emps || emps.length === 0) {
        setLoginError('Employee not found. Please check your ID or email.');
        setLoading(false);
        return;
      }

      const emp = emps[0];
      setEmployee(emp);

      if (emp.enrollment_email_sent_at) {
        const sentDate = new Date(emp.enrollment_email_sent_at);
        const deadline = new Date(sentDate.getTime() + 14 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const remaining = Math.max(0, Math.ceil((deadline - now) / (1000 * 60 * 60 * 24)));
        setDaysRemaining(remaining);
      }

      if (emp.enrollment_status === 'Opted Out') {
        setStep('opted-out');
      } else {
        setStep('dashboard');
      }

    } catch (err) {
      console.error('Login error:', err);
      setLoginError('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleOptOut = async () => {
    setLoading(true);
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/employees?id=eq.${employee.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            enrollment_status: 'Opted Out',
            opted_out_at: new Date().toISOString(),
            opt_out_reason: optOutReason || null
          })
        }
      );
      setStep('opted-out');
    } catch (err) {
      console.error('Opt-out error:', err);
    }
    setLoading(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const resetToLogin = () => {
    setStep('login');
    setEmployee(null);
    setOrganization(null);
    setCompanyCode('');
    setEmployeeId('');
  };

  // Login Screen
  if (step === 'login') {
    return (
      <div style={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, ${COLORS.navy} 0%, #2d5a8a 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: COLORS.white,
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '420px',
          width: '100%',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
              <span style={{ color: COLORS.lime }}>LIVE</span>
              <span style={{ color: COLORS.sky }}>WELL</span>
              <span style={{ color: COLORS.lime }}>360</span>
            </div>
            <h1 style={{ color: COLORS.navy, fontSize: '22px', margin: '0 0 8px', fontWeight: '600' }}>
              Your Benefits Portal
            </h1>
            <p style={{ color: COLORS.darkGray, fontSize: '14px', margin: 0 }}>
              View your personalized wellness benefits
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: COLORS.navy,
                marginBottom: '8px'
              }}>
                Company Code
              </label>
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                placeholder="e.g., ACME2024"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  border: `2px solid ${COLORS.lightGray}`,
                  borderRadius: '10px',
                  outline: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: COLORS.navy,
                marginBottom: '8px'
              }}>
                Employee ID or Email
              </label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="Your employee ID or email"
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '16px',
                  border: `2px solid ${COLORS.lightGray}`,
                  borderRadius: '10px',
                  outline: 'none'
                }}
              />
            </div>

            {loginError && (
              <div style={{
                padding: '12px 16px',
                background: `${COLORS.red}15`,
                border: `1px solid ${COLORS.red}30`,
                borderRadius: '8px',
                marginBottom: '20px'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: COLORS.red }}>{loginError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !companyCode || !employeeId}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600',
                background: loading ? COLORS.lightGray : `linear-gradient(135deg, ${COLORS.lime}, #5fa832)`,
                color: COLORS.white,
                border: 'none',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(122, 193, 67, 0.3)'
              }}
            >
              {loading ? 'Signing in...' : 'View My Benefits'}
            </button>
          </form>

          <p style={{
            textAlign: 'center',
            marginTop: '24px',
            fontSize: '13px',
            color: COLORS.darkGray
          }}>
            Need help? Call <a href="tel:8067991099" style={{ color: COLORS.sky }}>(806) 799-1099</a>
          </p>
        </div>
      </div>
    );
  }

  // Opted Out Confirmation
  if (step === 'opted-out') {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.gray,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: COLORS.white,
          borderRadius: '20px',
          padding: '48px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: `${COLORS.darkGray}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
            fontSize: '36px'
          }}>
            ✓
          </div>

          <h1 style={{ color: COLORS.navy, fontSize: '24px', margin: '0 0 16px' }}>
            You've Opted Out
          </h1>

          <p style={{ color: COLORS.darkGray, fontSize: '16px', lineHeight: '1.6', margin: '0 0 32px' }}>
            You will not be enrolled in the Live Well 360 wellness benefit program.
            If you change your mind, please contact your HR department.
          </p>

          <button
            onClick={resetToLogin}
            style={{
              padding: '14px 32px',
              fontSize: '15px',
              fontWeight: '500',
              background: 'transparent',
              color: COLORS.navy,
              border: `2px solid ${COLORS.navy}`,
              borderRadius: '10px',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Opt-Out Confirmation Screen
  if (step === 'optout') {
    return (
      <div style={{
        minHeight: '100vh',
        background: COLORS.gray,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: COLORS.white,
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: `${COLORS.red}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '28px'
            }}>
              ⚠️
            </div>
            <h2 style={{ color: COLORS.navy, fontSize: '22px', margin: '0 0 8px' }}>
              Are You Sure?
            </h2>
            <p style={{ color: COLORS.darkGray, fontSize: '14px', margin: 0 }}>
              You're about to opt out of the wellness benefit program
            </p>
          </div>

          <div style={{
            background: `${COLORS.red}10`,
            border: `1px solid ${COLORS.red}30`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <p style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: '600', color: COLORS.red }}>
              By opting out, you will lose:
            </p>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: COLORS.darkGray, lineHeight: '1.8' }}>
              <li><strong>{formatCurrency(employee?.benefit_amount || 77.77)}/month</strong> in additional take-home pay</li>
              <li>Free 24/7 telehealth visits (MDLive)</li>
              <li>8 free counseling sessions (AllOne Health)</li>
              <li>Prescription discount program (OVAL)</li>
            </ul>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: COLORS.navy,
              marginBottom: '8px'
            }}>
              Reason for opting out (optional)
            </label>
            <textarea
              value={optOutReason}
              onChange={(e) => setOptOutReason(e.target.value)}
              placeholder="Help us understand your decision..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                border: `1px solid ${COLORS.lightGray}`,
                borderRadius: '8px',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setStep('dashboard')}
              style={{
                flex: 1,
                padding: '14px',
                fontSize: '15px',
                fontWeight: '500',
                background: COLORS.lime,
                color: COLORS.white,
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              Keep My Benefits
            </button>
            <button
              onClick={handleOptOut}
              disabled={loading}
              style={{
                flex: 1,
                padding: '14px',
                fontSize: '15px',
                fontWeight: '500',
                background: 'transparent',
                color: COLORS.red,
                border: `2px solid ${COLORS.red}`,
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Processing...' : 'Confirm Opt-Out'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div style={{ minHeight: '100vh', background: COLORS.gray }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.navy} 0%, #2d5a8a 100%)`,
        padding: '24px 20px 80px',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px' }}>
          <span style={{ color: COLORS.lime }}>LIVE</span>
          <span style={{ color: COLORS.sky }}>WELL</span>
          <span style={{ color: COLORS.lime }}>360</span>
        </div>
        <h1 style={{ color: COLORS.white, fontSize: '26px', margin: '0 0 8px', fontWeight: '600' }}>
          Welcome, {employee?.first_name}!
        </h1>
        <p style={{ color: COLORS.sky, fontSize: '15px', margin: 0, opacity: 0.9 }}>
          {organization?.name}
        </p>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '600px', margin: '-60px auto 0', padding: '0 20px 40px' }}>

        {/* Paycheck Benefit Card */}
        <div style={{
          background: COLORS.white,
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div>
              <h2 style={{ color: COLORS.navy, fontSize: '18px', margin: '0 0 4px', fontWeight: '600' }}>
                Your Monthly Benefit
              </h2>
              <p style={{ color: COLORS.darkGray, fontSize: '13px', margin: 0 }}>
                Additional take-home pay each month
              </p>
            </div>
            <div style={{
              background: `${COLORS.lime}15`,
              padding: '6px 12px',
              borderRadius: '20px'
            }}>
              <span style={{ color: COLORS.lime, fontSize: '13px', fontWeight: '600' }}>
                {employee?.enrollment_status || 'Pending'}
              </span>
            </div>
          </div>

          <div style={{
            background: `linear-gradient(135deg, ${COLORS.lime} 0%, #5fa832 100%)`,
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            marginBottom: '20px'
          }}>
            <p style={{ color: COLORS.white, fontSize: '14px', margin: '0 0 4px', opacity: 0.9 }}>
              YOU GAIN
            </p>
            <p style={{ color: COLORS.white, fontSize: '42px', fontWeight: '700', margin: '0 0 4px' }}>
              {formatCurrency(employee?.benefit_amount || 77.77)}
            </p>
            <p style={{ color: COLORS.white, fontSize: '14px', margin: 0, opacity: 0.9 }}>
              per month
            </p>
          </div>

          {/* Breakdown */}
          <div style={{
            background: COLORS.gray,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            <p style={{ fontSize: '13px', fontWeight: '600', color: COLORS.navy, margin: '0 0 12px' }}>
              How It Works:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: COLORS.darkGray }}>FIT Savings (pre-tax)</span>
                <span style={{ color: COLORS.green, fontWeight: '500' }}>+{formatCurrency(employee?.fit_savings || 117)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: COLORS.darkGray }}>FICA Savings</span>
                <span style={{ color: COLORS.green, fontWeight: '500' }}>+{formatCurrency(employee?.fica_savings || 50)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: COLORS.darkGray }}>Employee Fee</span>
                <span style={{ color: COLORS.red, fontWeight: '500' }}>-{formatCurrency(employee?.fee_amount || 89.73)}</span>
              </div>
              <div style={{
                borderTop: `1px solid ${COLORS.lightGray}`,
                paddingTop: '8px',
                marginTop: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '15px',
                fontWeight: '600'
              }}>
                <span style={{ color: COLORS.navy }}>Net Monthly Benefit</span>
                <span style={{ color: COLORS.lime }}>{formatCurrency(employee?.benefit_amount || 77.77)}</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '12px', color: COLORS.darkGray, margin: 0, lineHeight: '1.5' }}>
            The premium is deducted pre-tax from your paycheck, and you receive a 100% reimbursement plus wellness benefits.
            Your net gain is the tax savings minus the small employee fee.
          </p>
        </div>

        {/* Wellness Benefits */}
        <div style={{
          background: COLORS.white,
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ color: COLORS.navy, fontSize: '18px', margin: '0 0 20px', fontWeight: '600' }}>
            Your Wellness Benefits
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {BENEFITS.map((benefit, idx) => (
              <div key={idx} style={{
                background: COLORS.gray,
                borderRadius: '12px',
                padding: '20px',
                borderLeft: `4px solid ${benefit.color}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px' }}>{benefit.icon}</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: COLORS.navy }}>
                      {benefit.name}
                    </h3>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: COLORS.darkGray }}>
                      {benefit.description}
                    </p>
                  </div>
                </div>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: COLORS.darkGray, lineHeight: '1.8' }}>
                  {benefit.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Opt-Out Section */}
        {daysRemaining > 0 && employee?.enrollment_status !== 'Enrolled' && (
          <div style={{
            background: COLORS.white,
            borderRadius: '20px',
            padding: '28px',
            marginBottom: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ color: COLORS.navy, fontSize: '18px', margin: '0 0 8px', fontWeight: '600' }}>
              Don't Want These Benefits?
            </h2>
            <p style={{ color: COLORS.darkGray, fontSize: '14px', margin: '0 0 16px', lineHeight: '1.5' }}>
              You have <strong>{daysRemaining} days</strong> remaining to opt out.
              After this window closes, you will be automatically enrolled.
            </p>
            <button
              onClick={() => setStep('optout')}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: '500',
                background: 'transparent',
                color: COLORS.red,
                border: `2px solid ${COLORS.red}`,
                borderRadius: '10px',
                cursor: 'pointer'
              }}
            >
              I Want to Opt Out
            </button>
          </div>
        )}

        {/* Contact */}
        <div style={{
          background: COLORS.white,
          borderRadius: '20px',
          padding: '28px',
          marginBottom: '20px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{ color: COLORS.navy, fontSize: '18px', margin: '0 0 12px', fontWeight: '600' }}>
            Questions?
          </h2>
          <p style={{ color: COLORS.darkGray, fontSize: '14px', margin: '0 0 16px' }}>
            We're here to help you understand your benefits
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="tel:8067991099"
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                background: COLORS.navy,
                color: COLORS.white,
                borderRadius: '8px',
                textDecoration: 'none'
              }}
            >
              📞 (806) 799-1099
            </a>
            <a
              href="mailto:info@livewellhsa.com"
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                background: 'transparent',
                color: COLORS.navy,
                border: `2px solid ${COLORS.navy}`,
                borderRadius: '8px',
                textDecoration: 'none'
              }}
            >
              ✉️ Email Us
            </a>
          </div>
        </div>

        {/* Sign Out */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={resetToLogin}
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              background: 'transparent',
              color: COLORS.darkGray,
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: COLORS.navy,
        padding: '20px',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0, fontSize: '12px', color: COLORS.sky, opacity: 0.8 }}>
          © {new Date().getFullYear()} Live Well 360 Health Strategy Advisors | livewellhealth360.com
        </p>
      </div>
    </div>
  );
}
