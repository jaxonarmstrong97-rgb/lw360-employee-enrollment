import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f0f2f5',fontFamily:"'Segoe UI',Arial,sans-serif",padding:'24px'}}>
          <div style={{background:'#fff',borderRadius:12,padding:'48px 40px',maxWidth:480,textAlign:'center',boxShadow:'0 4px 24px rgba(0,0,0,0.08)'}}>
            <div style={{fontSize:48,marginBottom:16}}>⚠️</div>
            <h2 style={{color:'#1A395C',margin:'0 0 12px',fontSize:22}}>Something went wrong</h2>
            <p style={{color:'#64748b',margin:'0 0 24px',lineHeight:1.6}}>We encountered an unexpected error. Please try refreshing, or contact your HR department for assistance.</p>
            <button onClick={()=>window.location.reload()} style={{background:'#7AC143',color:'#fff',border:'none',borderRadius:8,padding:'12px 28px',fontSize:14,fontWeight:700,cursor:'pointer'}}>Refresh Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App /></ErrorBoundary>
);
