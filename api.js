exports.handler = async (event, context) => {
  const path = event.path.replace('/.netlify/functions/api', '');
  
  if (path === '/api/healthz') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ok' })
    };
  }

  if (path === '/api/auth/login') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user: { id: 1, username: 'veemehlo', role: 'admin' },
        token: 'demo-token'
      })
    };
  }

  return {
    statusCode: 404,
    body: JSON.stringify({ error: 'Not found' })
  };
};