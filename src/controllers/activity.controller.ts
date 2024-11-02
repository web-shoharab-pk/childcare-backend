import { NextFunction, Request, Response } from "express";
import { AppError } from "../middlewares/error.middleware";
import { Activity } from "../models/Activity";
import { Booking } from "../models/Booking";
import logger from "../utils/logger";

export class ActivityController {
  // Create a new activity
  static async createActivity(req: Request, res: Response, next: NextFunction) {
    try {
      // Create activity from request body
      const activity = new Activity({
        ...req.body,
        createdBy: (req as any).user.userId, // Track who created it
      });

      // Validate and save
      await activity.save();
      logger.info("Activity created successfully", {
        activityId: activity._id,
      });

      // Return success response with created activity
      res.status(201).json({
        success: true,
        traceId: req.headers["x-trace-id"],
        data: activity,
      });
    } catch (error) {
      // Pass error to error handler with trace ID
      logger.error("Failed to create activity", { error });
      next(new AppError("Failed to create activity", error, 400));
    }
  }

  // Get all activities
  static async getActivities(req: Request, res: Response, next: NextFunction) {
    try {
      // Fetch all activities from database
      const activities = await Activity.find()
        .populate("createdBy", "name email") // Populate creator details
        .populate("attendees", "name email") // Populate attendee details
        .sort({ date: 1 }); // Sort by date ascending

      logger.info("Activities retrieved successfully", {
        count: activities.length,
      });

      // Return success response with activities
      res.status(200).json({
        success: true,
        traceId: req.headers["x-trace-id"],
        data: activities,
      });
    } catch (error) {
      // Pass error to error handler with trace ID
      logger.error("Failed to retrieve activities", { error });
      next(new AppError("Failed to retrieve activities", error, 500));
    }
  }

  // Update an activity
  static async updateActivity(req: Request, res: Response, next: NextFunction) {
    try {
      // Find and update activity with validation
      const activity = await Activity.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true, // Return updated document
          runValidators: true, // Run schema validators
        }
      )
        .populate("createdBy", "name email") // Populate creator details
        .populate("attendees", "name email"); // Populate attendee details

      // Handle case where activity is not found
      if (!activity) {
        logger.warn("Activity not found for update", {
          activityId: req.params.id,
        });
        next(new AppError("Activity not found", "NOT_FOUND", 404));
        return;
      }

      logger.info("Activity updated successfully", {
        activityId: activity._id,
      });

      // Return success response with updated activity
      res.status(200).json({
        success: true,
        traceId: req.headers["x-trace-id"],
        data: activity,
      });
    } catch (error) {
      // Pass error to error handler with trace ID
      logger.error("Failed to update activity", {
        error,
        activityId: req.params.id,
      });
      next(new AppError("Failed to update activity", error, 400));
    }
  }

  // Delete an activity
  static async deleteActivity(req: Request, res: Response, next: NextFunction) {
    try {
      // Find and delete activity
      const activity = await Activity.findById(req.params.id);

      // Handle case where activity is not found
      if (!activity) {
        logger.warn("Activity not found for deletion", {
          activityId: req.params.id,
        });
        next(new AppError("Activity not found", "NOT_FOUND", 404));
        return;
      }

      await Activity.findByIdAndDelete(req.params.id);
      logger.info("Activity deleted successfully", {
        activityId: req.params.id,
      });

      // Return success response with no content
      res.status(200).json({
        success: true,
        message: "Activity deleted successfully",
        traceId: req.headers["x-trace-id"],
      });
      return;
    } catch (error) {
      // Pass error to error handler with trace ID
      logger.error("Failed to delete activity", {
        error,
        activityId: req.params.id,
      });
      next(new AppError("Failed to delete activity", error, 500));
    }
  }

  // Track attendance
  static async trackAttendance(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId } = req.body;

      // Validate userId
      if (!userId) {
        logger.warn("Missing user ID in attendance tracking request");
        return next(
          new AppError("User ID is required", "MISSING_USER_ID", 400)
        );
      }

      // Find and update activity in one operation
      const activity = await Activity.findByIdAndUpdate(
        req.params.id,
        {
          $addToSet: { attendees: userId }, // Only adds if not already present
        },
        {
          new: true, // Return updated document
          runValidators: true, // Run schema validators
        }
      ).populate("attendees", "name email"); // Populate attendee details

      if (!activity) {
        logger.warn("Activity not found for attendance tracking", {
          activityId: req.params.id,
        });
        return next(new AppError("Activity not found", "NOT_FOUND", 404));
      }

      logger.info("Attendance tracked successfully", {
        activityId: activity._id,
        userId,
      });

      // Return success response with updated activity
      res.status(200).json({
        success: true,
        traceId: req.headers["x-trace-id"],
        data: activity,
      });
    } catch (error) {
      logger.error("Failed to track attendance", {
        error,
        activityId: req.params.id,
      });
      next(new AppError("Failed to track attendance", error, 500));
    }
  }

  // Generate activity report
  static async generateReport(req: Request, res: Response, next: NextFunction) {
    try {
      // Retrieve all activities with populated attendee details
      const activities = await Activity.find()
        .populate("attendees", "name email")
        .sort({ date: -1 }); // Sort activities by date in descending order

      // Check if any activities were found
      if (!activities.length) {
        logger.warn("No activities found for report generation");
        return next(new AppError("No activities found", "NO_ACTIVITIES", 404));
      }

      // Generate report statistics
      const totalActivities = activities.length;
      const upcomingActivities = activities.filter(
        (a) => new Date(a.date) > new Date()
      ).length;
      const pastActivities = totalActivities - upcomingActivities;
      const averageAttendance = totalActivities
        ? activities.reduce((acc, curr) => acc + curr.attendees.length, 0) /
          totalActivities
        : 0;

      const activitiesByLocation = activities.reduce(
        (acc: Record<string, number>, curr) => {
          acc[curr.location] = (acc[curr.location] ?? 0) + 1;
          return acc;
        },
        {}
      );

      // Calculate total bookings for each activity
      const bookingsPromises = activities.map(async (activity) => {
        const totalBookings = await Booking.countDocuments({
          activityId: activity._id,
        });
        return {
          id: activity._id,
          name: activity.name,
          date: activity.date,
          location: activity.location,
          attendeeCount: activity.attendees.length,
          description: activity.description,
          totalBookings, // Add total bookings under each activity
        };
      });

      const detailedActivities = await Promise.all(bookingsPromises);

      const reportData = {
        totalActivities,
        upcomingActivities,
        pastActivities,
        averageAttendance,
        activitiesByLocation,
        activities: detailedActivities,
      };

      logger.info("Activity report generated successfully", {
        totalActivities,
        upcomingActivities,
        pastActivities,
      });

      res.status(200).json({
        success: true,
        traceId: req.headers["x-trace-id"],
        timestamp: new Date().toISOString(),
        data: reportData,
      });
    } catch (error) {
      logger.error("Failed to generate activity report", { error });
      next(
        new AppError(
          "Failed to generate activity report",
          "REPORT_GENERATION_ERROR",
          500
        )
      );
    }
  }

  // Get activity by activity id
  static async getActivityById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const activity = await Activity.findById(id)
        .populate("createdBy", "name email") // Populate creator details
        .populate("attendees", "name email"); // Populate attendee details

      if (!activity) {
        next(new AppError("Activity not found", "ACTIVITY_NOT_FOUND", 404));
        return;
      }

      logger.info("Activity retrieved successfully", { activityId: id });

      res.status(200).json({
        success: true,
        traceId: req.headers["x-trace-id"],
        timestamp: new Date().toISOString(),
        data: {
          id: activity._id,
          name: activity.name,
          date: activity.date,
          location: activity.location,
          attendees: activity.attendees,
          description: activity.description,
        },
      });
    } catch (error) {
      logger.error("Failed to retrieve activity", { error });
      next(
        new AppError(
          "Failed to retrieve activity",
          "ACTIVITY_RETRIEVAL_ERROR",
          500
        )
      );
    }
  }
}
