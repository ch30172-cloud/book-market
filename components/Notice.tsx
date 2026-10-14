export function Notice({
  error,
  success,
}: {
  error?: string;
  success?: string;
}) {
  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error.slice(0, 300)}
        </p>
      )}
      {success && (
        <p className="notice" role="status">
          {success.slice(0, 300)}
        </p>
      )}
    </>
  );
}
