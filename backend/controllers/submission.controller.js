import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import axios from 'axios';
import { mapJudge0Verdict } from '../config/verdictMapper.js';


const JUDGE0_URL =
  "http://localhost:2358/submissions?base64_encoded=false&wait=true";

const languageMap = {
  cpp: 54,
  c: 50,
  java: 62,
  python: 71,
  javascript: 63
};

const createSubmission = async (req, res) => {
  try {
    const { problemId, code, language } = req.body;
    const userId = req.user.id;

    if (!problemId || !code || !language) {
      return res.status(400).json({
        success: false,
        message: "Missing fields"
      });
    }

    const problem = await Problem.findById(problemId);

    if (!problem) {
      return res.status(404).json({
        success: false,
        message: "Problem not found"
      });
    }

    const language_id = languageMap[language];

    const judgeResponse = await axios.post(
      JUDGE0_URL,
      {
        source_code: code,
        language_id
      },
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    const result = judgeResponse.data;

    //mapping verdict
    const verdict = mapJudge0Verdict(result.status.description);

    //creating submission
    const newSubmission = await Submission.create({
      userId,
      problemId,
      code,
      language,
      verdict,
      executionTime: result.time || "0"
    });

    res.status(201).json({
      success: true,
      judge0Response: result,
      submission: newSubmission
    });

  } catch (err) {
    console.error(err.message);

    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

const getSubmissions = async (req, res) => {
    try {
        const submissions = await Submission.find({ userId: req.user.id }).sort({ createdAt: -1 }).select("-code");


        res.status(200).json({
            success: true,
            message: "submissions found",
            count: submissions.length,
            data: submissions
        });

    } catch (err) {
        console.log(`An error occured ${err.message}`);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

const getOneSubmission = async (req, res) => {
    try {
        const submissionId = req.params.id;

        const submission = await Submission.findById(submissionId);

        //checking if submission exists or not
        if (!submission) {
            return res.status(404).json({
                success: false,
                message: "Submission not found",
            });
        }

        //sending the submission if the logedIn user is admin
        if (req.user.role === "admin") {
            return res.status(200).json({
                success: true,
                message: "Submissions found",
                data: submission
            });
        }

        if (submission.userId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: "Forbidden",
            });
        }

        res.status(200).json({
            success: true,
            message: "Submission found",
            data: submission
        });
    } catch (err) {
        console.log(`An error occured ${err.message}`);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

const getAllSubmissionsOfaProblem = async (req, res) => {
    try {
        const slug = req.params.slug;

        //finding the problem with given slug
        const problem = await Problem.findOne({ slug });

        //checking if problem with given slug exists or not
        if (!problem) {
            return res.status(404).json({
                success: false,
                message: "Problem not found",
            });
        }

        //finding the submissions attached with the problem
        const submission = await Submission.find({ problemId: problem._id, userId: req.user.id }).sort({ createdAt: -1 }).select("-code");

        //checking if submission exists or not
        if (submission.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Submission not found"
            });
        }

        //seding response
        res.status(200).json({
            success: true,
            message: "Submission found",
            data: submission
        });

    } catch (err) {
        console.log(`An error occured ${err.message}`);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

export { createSubmission, getOneSubmission, getSubmissions, getAllSubmissionsOfaProblem };