import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFound() {
    return (
        <div className="row justify-content-center my-5">
            <div className="col-md-7 text-center">
                <div className="card p-5 shadow-sm">
                    <span className="display-1 text-danger mb-3 d-block">404</span>
                    <h1 className="h3 fw-bold text-dark mb-2">Page or Language Not Found</h1>
                    <p className="text-secondary mb-4">
                        The syntax database or page you requested does not exist or has been moved.
                    </p>
                    <div>
                        <Link to="/languages" className="btn btn-success px-4 py-2">
                            &larr; Return to Languages
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
