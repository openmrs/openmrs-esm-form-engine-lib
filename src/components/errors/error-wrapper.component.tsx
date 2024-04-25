import React, { useMemo } from 'react';

const withErrorHandling = (Component) => {
  return function WrappedComponent({ errors = [], fieldConditionalRequiredErrCode, ...props }) {
    const isFieldConditionalRequiredErrCode = useMemo(
      () => errors.length > 0 && errors[0]?.errCode == fieldConditionalRequiredErrCode,
      [errors, fieldConditionalRequiredErrCode],
    );

    return <Component isFieldConditionalRequiredErrCode={isFieldConditionalRequiredErrCode} {...props} />;
  };
};

export default withErrorHandling;
